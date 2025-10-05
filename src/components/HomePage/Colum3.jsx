import React, { useEffect, useRef, useState } from "react";
import {
  getMessages,
  getFriends,
  getFriendRequests,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  connectWebSocket,
  sendWebSocketMessage,
  getChannelMembers,
  // 2 API dưới đây cần có trong services/api.js
  recallMessage,
  hideMessageForMe,
  uploadFile,
} from "../../services/api";
import { BsThreeDotsVertical } from "react-icons/bs";
import ChannelMenu from "../Channel/ChannelMenu";
import ChannelModal from "../Channel/ChannelModal";

const Column3 = ({ mode, selectedOption, currentChannel }) => {
  const [friends, setFriends] = useState([]);
  const [friendsError, setFriendsError] = useState("");
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [friendRequestsError, setFriendRequestsError] = useState("");
  const [messages, setMessages] = useState([]);
  const [messagesError, setMessagesError] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [newMessageError, setNewMessageError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [myRole, setMyRole] = useState("Member");
  const [modal, setModal] = useState({ type: null, data: null });
  // --- ghi âm ---
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const [recordingStart, setRecordingStart] = useState(null);
  const [recordingMs, setRecordingMs] = useState(0);
  // --- xem lại voice trước khi gửi ---
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const canvasRef = useRef(null);
  const [audioContext, setAudioContext] = useState(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);

  // ----- context menu -----
  const [ctxMenu, setCtxMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    message: null,
  });

  const me = sessionStorage.getItem("userID");
  const scrollBottomRef = useRef(null);
  const listRef = useRef(null); // khung cuộn tin nhắn

  const isImage = (f) => f && /^image\//i.test(f.type);
  const formatDuration = (ms) => {
    const sec = Math.floor(ms / 1000);
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.src = recordedUrl || "";
  }, [recordedUrl]);

  useEffect(() => {
    if (!isRecording || !recordingStart) return;
    const t = setInterval(() => setRecordingMs(Date.now() - recordingStart), 200);
    return () => clearInterval(t);
  }, [isRecording, recordingStart]);

  // Auto scroll
  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Đóng context menu khi click ngoài / ESC
  useEffect(() => {
    const onDocClick = () => setCtxMenu((s) => ({ ...s, visible: false, message: null }));
    const onEsc = (e) => {
      if (e.key === "Escape") onDocClick();
    };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    // KHÔNG add listener cho 'contextmenu' nữa, kẻo vừa mở đã bị đóng
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Điều hướng dữ liệu theo mode/option
  useEffect(() => {
    if (mode === "friends") {
      setLoading(true);
      if (selectedOption === "Danh sách bạn bè") {
        fetchFriends();
      } else if (selectedOption === "Lời mời kết bạn") {
        fetchFriendRequests();
      }
    } else if (mode === "chat" && currentChannel) {
      if (!currentChannel || (!currentChannel.id && !currentChannel.channelID)) {
        setMessagesError("Kênh không hợp lệ.");
        return;
      }
      fetchMessages(currentChannel.id || currentChannel.channelID);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, selectedOption, currentChannel]);

  // WebSocket realtime
  useEffect(() => {
    if (!currentChannel) return;
    const currentId = currentChannel.id || currentChannel.channelID;

    const ws = connectWebSocket((incoming) => {
      if (!incoming?.channelId) return;
      if (incoming.channelId !== currentId) return;

      // Nếu là sự kiện recall
      if (incoming.type === "message_recalled") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === incoming.messageId
              ? { ...m, recalled: true, content: "" }
              : m
          )
        );
        return; // dừng, không chuẩn hoá như message thường
      }

      // Nếu là tin nhắn thường
      const standardizedMessage = {
        id: incoming.id || Math.random().toString(36).substring(7),
        content: incoming.content ?? "",
        timestamp: incoming.timestamp || new Date().toISOString(),
        messageType: incoming.messageType || "Text",
        senderId: incoming.senderId || "Unknown",
        senderName: incoming.senderName || "Người gửi",
        senderAvatar: incoming.senderAvatar || "/default-avatar.png",
        status: incoming.status || "sent",
        recalled: !!incoming.recalled,
        url: incoming.url || null,
        fileId: incoming.fileId || null,
        channelId: incoming.channelId,
      };

      setMessages((prev) => [...prev, standardizedMessage]);
    });

    return () => ws.close();
  }, [currentChannel]);

  // API: Messages
  const fetchMessages = async (channelID) => {
    try {
      const userID = sessionStorage.getItem("userID");
      const response = await getMessages(channelID, userID);
      const list = Array.isArray(response?.messages)
        ? response.messages
        : Array.isArray(response?.message)
        ? response.message
        : Array.isArray(response)
        ? response
        : [];
      setMessages(list);
      setMessagesError("");
    } catch (err) {
      setMessages([]);
      setMessagesError("Không thể tải tin nhắn: " + (err?.message || "Unknown error"));
    }
  };

  const handleSendMessage = async () => {
    if (!currentChannel || (!currentChannel.id && !currentChannel.channelID)) {
      setNewMessageError("Không thể gửi: kênh không hợp lệ.");
      return;
    }

    try {
      if (recordedBlob) {
        const voiceFile = new File([recordedBlob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        const uploaded = await uploadFile(voiceFile);
        await sendWebSocketMessage(
          currentChannel.id || currentChannel.channelID, 
          uploaded.url, 
          "Voice"
        );
        // reset voice preview
        discardRecorded();
        setNewMessageError("");
        return;
      }

      // 1) Nếu đang có file đã chọn → upload & gửi File
      if (selectedFile) {
        const uploaded = await uploadFile(selectedFile);
        await sendWebSocketMessage(
          currentChannel.id || currentChannel.channelID,
          uploaded.url,
          "File"
        );
        setSelectedFile(null);
        setPreviewUrl(null);
        setNewMessageError("");
        return;
      }

      // 2) Nếu là text
      if (!newMessage.trim()) return;
      await sendWebSocketMessage(
        currentChannel.id || currentChannel.channelID,
        newMessage,
        "Text"
      );
      setNewMessage("");
      setNewMessageError("");
    } catch (err) {
      setNewMessageError("Không thể gửi.");
    }
  };

  // Khi chọn file
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ✅ Check 25MB (khớp BE MaxBytesReader 25MB)
    const MAX = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX) {
      alert("Kích thước file vượt quá 25MB!");
      // reset input để có thể chọn lại cùng file
      e.target.value = "";
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    // ✅ reset giá trị input để lần sau chọn lại cùng file vẫn trigger onChange
    e.target.value = "";
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items || [];
    for (const it of items) {
      if (it.kind === "file") {
        const blob = it.getAsFile();
        if (blob && /^image\//i.test(blob.type)) {
          const file = new File([blob], `paste-${Date.now()}.png`, { type: blob.type });
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
          e.preventDefault();
          return;
        }
      }
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // --- Tạo AudioContext và Analyser ---
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      await audioCtx.resume();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
      setAudioContext(audioCtx);

      // --- Hàm vẽ waveform ---
      const drawVisualizer = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) {
          rafRef.current = requestAnimationFrame(drawVisualizer);
          return;
        }

        const width = canvas.width;
        const height = canvas.height;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(dataArray);

        // nền tối
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(0, 0, width, height);

        // đường giữa (nếu im lặng vẫn thấy)
        ctx.strokeStyle = "rgba(168,85,247,0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // waveform
        ctx.strokeStyle = "#a855f7";
        ctx.lineWidth = 2;
        ctx.beginPath();

        const sliceWidth = width / dataArray.length;
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.lineTo(width, height / 2);
        ctx.stroke();

        rafRef.current = requestAnimationFrame(drawVisualizer);
      };

      // bắt đầu vẽ
      rafRef.current = requestAnimationFrame(drawVisualizer);

      // --- Tạo MediaRecorder ---
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mr;

      chunksRef.current = [];
      setRecordingMs(0);
      setRecordingStart(Date.now());
      setRecordedBlob(null);
      setRecordedUrl(null);
      setIsRecording(true);

      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = () => {
        try {
          // dừng animation
          if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }

          const blob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });
          if (blob.size > 0) {
            setRecordedBlob(blob);
            setRecordedUrl(URL.createObjectURL(blob));
          }
        } finally {
          mediaStreamRef.current?.getTracks()?.forEach((t) => t.stop());
          audioCtx.close();
          setAudioContext(null);
          setIsRecording(false);
          setRecordingStart(null);
        }
      };

      mr.start(200);
    } catch (err) {
      console.error("Không truy cập được micro:", err);
      alert("Không truy cập được micro. Vui lòng kiểm tra quyền.");
    }
  };


  const stopRecording = () => {
    try {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      mediaRecorderRef.current?.stop();
    } catch (err) {
      console.error("Lỗi khi dừng ghi:", err);
    }
  };

  const discardRecorded = () => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedBlob(null);
    setRecordedUrl(null);
    setIsPlaying(false);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (audioContext) {
      audioContext.close();
      setAudioContext(null);
    }
  };

  const togglePlayPreview = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
    } else {
      a.pause();
    }
  };

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onEnded);
    };
  }, [recordedUrl]);

  // Helpers
  const isMine = (msg) => msg?.senderId?.toString() === me?.toString();

  // Mở menu tại vị trí chuột phải (theo toạ độ của khung cuộn listRef)
  const openMessageMenu = (e, msg) => {
    e.preventDefault();
    e.stopPropagation();

    const host = listRef.current;
    if (!host) return;

    const hostRect = host.getBoundingClientRect();
    let x = e.clientX - hostRect.left + host.scrollLeft;
    let y = e.clientY - hostRect.top + host.scrollTop;

    const menuWidth = 190;
    const menuHeight = 80;

    if (x + menuWidth > host.scrollWidth) x = host.scrollWidth - menuWidth - 10;
    if (y + menuHeight > host.scrollHeight) y = host.scrollHeight - menuHeight - 10;

    setCtxMenu({ visible: true, x, y, message: msg });
  };

  const handleRecall = async () => {
    if (!ctxMenu.message?.id) return;
    try {
      await recallMessage(ctxMenu.message.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === ctxMenu.message.id ? { ...m, recalled: true, content: "" } : m
        )
      );
    } catch (err) {
      alert(err?.message || "Không thể thu hồi tin nhắn");
    } finally {
      setCtxMenu((s) => ({ ...s, visible: false, message: null }));
    }
  };

  // Thời gian cho phép thu hồi tin nhắn (2 phút)
  const RECALL_WINDOW_MS = 2 * 60 * 1000;

  // Kiểm tra tin nhắn có hết hạn thu hồi chưa
  const isRecallExpired = (msg) => {
    if (!msg?.timestamp) return true;
    const msgTime = new Date(msg.timestamp).getTime();
    return Date.now() - msgTime > RECALL_WINDOW_MS;
  };

  const handleHideForMe = async () => {
    if (!ctxMenu.message?.id) return;
    try {
      await hideMessageForMe(ctxMenu.message.id);
      setMessages((prev) => prev.filter((m) => m.id !== ctxMenu.message.id));
    } catch (err) {
      alert(err?.message || "Không thể xóa tin nhắn phía bạn");
    } finally {
      setCtxMenu((s) => ({ ...s, visible: false, message: null }));
    }
  };

  // API: Friends
  const fetchFriends = async () => {
    try {
      const userId = sessionStorage.getItem("userID");
      const res = await getFriends(userId);
      setFriends(Array.isArray(res) ? res : []);
      setFriendsError("");
    } catch {
      setFriends([]);
      setFriendsError("Không thể tải danh sách.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFriendRequests = async () => {
    try {
      const userId = sessionStorage.getItem("userID");
      const res = await getFriendRequests(userId);
      setFriendRequests(Array.isArray(res) ? res : []);
      setFriendRequestsError("");
    } catch {
      setFriendRequests([]);
      setFriendRequestsError("Không thể tải danh sách lời mời kết bạn.");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFriendRequest = async (friendID) => {
    const userID = sessionStorage.getItem("userID");
    try {
      await acceptFriendRequest(userID, friendID);
      setFriendRequests((prev) => prev.filter((r) => r.friendID !== friendID));
    } catch {}
  };

  const handleDeclineFriendRequest = async (friendID) => {
    const userID = sessionStorage.getItem("userID");
    try {
      await declineFriendRequest(userID, friendID);
      setFriendRequests((prev) => prev.filter((r) => r.friendID !== friendID));
    } catch {
      alert("Không thể từ chối lời mời kết bạn.");
    }
  };

  const handleRemoveFriend = async (friendID) => {
    const userID = sessionStorage.getItem("userID");
    try {
      await removeFriend(userID, friendID);
      setFriends((prev) => prev.filter((f) => f.friendID !== friendID));
    } catch {
      alert("Không thể xóa bạn.");
    }
  };

  const handleOpenMenu = async () => {
    if (!currentChannel?.channelID) return;
    try {
      const members = await getChannelMembers(currentChannel.channelID);
      const me = sessionStorage.getItem("userID");
      const myMember = members.find((m) => m.MemberID === me);
      setMyRole(myMember?.Role || "Member");
      setMenuOpen(true);
    } catch (err) {
      console.error("Không thể lấy danh sách thành viên:", err);
      setMenuOpen(true);
    }
  };

  const handleChannelAction = (action) => {
    switch (action) {
      case "addMember":
        setModal({ type: "addMember" });
        break;
      case "listMembers":
        setModal({ type: "listMembers" });
        break;
      case "blockedList":
        setModal({ type: "blockedList" });
        break;
      case "leaveChannel":
        setModal({ type: "confirmLeave" });
        break;
      case "dissolveChannel":
        setModal({ type: "confirmDissolve" });
        break;
      default:
        alert("Chức năng chưa được hỗ trợ");
    }
  };

  // UI
  const renderChatWindow = () => (
    <div className="flex h-full flex-col rounded-xl p-4 bg-gradient-to-br from-black via-purple-900 to-black shadow-[0_0_20px_#a855f7]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-purple-700 pb-3 mb-3">
        <img
          src={currentChannel?.userAvatar || currentChannel?.channelAvatar}
          alt={currentChannel?.userName || currentChannel?.channelName || "Channel"}
          className="w-10 h-10 rounded-full border border-purple-400 object-cover"
        />
        <div>
          <h3 className="text-lg font-bold text-purple-300">
            {currentChannel?.channelName || currentChannel?.userName || "Không tên"}
          </h3>
          <p className="text-xs text-gray-400">{currentChannel?.channelType || ""}</p>
        </div>
        <button
          onClick={handleOpenMenu}
          className="ml-auto p-2 rounded-full hover:bg-purple-700/30 transition"
        >
          <BsThreeDotsVertical className="w-6 h-6 text-gray-400 hover:text-white" />
        </button>
        <ChannelMenu
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          currentChannel={currentChannel}
          role={myRole}
          onAction={handleChannelAction}
        />
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="relative flex-1 overflow-y-auto space-y-2 p-2 rounded-lg bg-black/30 backdrop-blur-sm"
      >
        {messagesError && <p className="text-red-400 text-sm">{messagesError}</p>}
        {messages.length > 0 ? (
          messages.map((msg) => {
            const mine = isMine(msg);
            const isRecalled = !!msg.recalled;
            return (
              <div
                key={msg.id || msg.timestamp}
                className={`flex ${mine ? "justify-end" : "justify-start"}`}
                onContextMenu={(e) => openMessageMenu(e, msg)}
              >
                <div className="max-w-[70%] flex items-start gap-2">
                  {!mine && !isRecalled && (
                    <img
                      src={msg.senderAvatar || "/default-avatar.png"}
                      alt="avatar"
                      className="w-7 h-7 rounded-full border border-purple-500 object-cover shrink-0"
                    />
                  )}
                  <div
                    className={`px-3 py-2 rounded-2xl text-sm text-white shadow transition select-text
                      ${
                        mine
                          ? "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-blue-600 shadow-[0_0_12px_#a855f7]"
                          : "bg-purple-700/30 border border-purple-500/40"
                      } ${isRecalled ? "opacity-70" : ""}`}
                  >
                    {!mine && !isRecalled && (
                      <div className="text-xs text-purple-300 font-semibold mb-0.5">
                        {msg.senderName || "Người gửi"}
                      </div>
                    )}
                    {/* nội dung tin nhắn */}
                    {isRecalled ? (
                      <div className="italic text-gray-400">Tin nhắn đã được thu hồi</div>
                    ) : msg.messageType === "Voice" && msg.url ? (
                      <div className="flex flex-col items-start">
                        <audio
                          src={msg.url}
                          controls
                          className="w-56 rounded-md border border-purple-400 mt-1"
                        />
                        <span className="text-[11px] text-gray-400 mt-1">
                          🎤 Voice message • {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ) : msg.messageType === "File" && msg.url ? (
                      msg.url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                        <img
                          src={msg.url}
                          alt="Ảnh"
                          className="rounded-lg max-w-[220px] mt-1 border border-purple-500/30"
                        />
                      ) : msg.url.match(/\.(mp4|webm)$/i) ? (
                        <video
                          src={msg.url}
                          controls
                          className="rounded-lg max-w-[240px] mt-1 border border-purple-500/30"
                        />
                      ) : msg.url.match(/\.(mp3|wav)$/i) ? (
                        <audio
                          src={msg.url}
                          controls
                          className="w-56 rounded-md border border-purple-400 mt-1"
                        />
                      ) : (
                        <a
                          href={msg.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-2 py-1 mt-1 rounded-md border border-purple-500/30 hover:bg-purple-700/20 transition"
                        >
                          📎 <span className="text-blue-300 break-all">{msg.url.split("/").pop()}</span>
                        </a>
                      )
                    ) : (
                      <div className="break-words text-white">{msg.content}</div>
                    )}
                    <div className="text-[10px] text-gray-300 mt-1 text-right">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-400 italic">Chưa có tin nhắn</p>
        )}

        {/* Context menu tin nhắn */}
        {ctxMenu.visible && ctxMenu.message && (
          <div
            className="absolute z-50 min-w-[190px] rounded-lg border border-purple-600/40 bg-[#1a1426] shadow-xl p-1"
            style={{ left: ctxMenu.x, top: ctxMenu.y }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              className={`w-full text-left px-3 py-2 rounded-md hover:bg-purple-700/30
                ${
                  isMine(ctxMenu.message)
                    ? isRecallExpired(ctxMenu.message)
                      ? "text-gray-400 cursor-not-allowed opacity-60" // hết hạn → xám + khóa
                      : "text-red-400 font-semibold" // còn hạn → đỏ đậm để nhấn mạnh
                    : "text-gray-400 cursor-not-allowed"
                }
                ${ctxMenu.message.recalled ? "opacity-60 cursor-not-allowed" : ""}`}
              onClick={
                isMine(ctxMenu.message) &&
                !ctxMenu.message.recalled &&
                !isRecallExpired(ctxMenu.message)
                  ? handleRecall
                  : undefined
              }
              disabled={
                !isMine(ctxMenu.message) ||
                ctxMenu.message.recalled ||
                isRecallExpired(ctxMenu.message)
              }
            >
              {isRecallExpired(ctxMenu.message)
                ? "Thu hồi (hết hạn)"
                : "Thu hồi tin nhắn"}
            </button>

            <button
              className="w-full text-left px-3 py-2 rounded-md hover:bg-purple-700/30 text-white"
              onClick={handleHideForMe}
            >
              Xóa tin nhắn phía bạn
            </button>
          </div>
        )}

        <div ref={scrollBottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3 w-full">
        {newMessageError && (
          <p className="text-red-400 text-sm mb-2">{newMessageError}</p>
        )}

        {selectedFile && isImage(selectedFile) && previewUrl && (
          <div className="mb-2">
            <div className="bg-black/40 border border-purple-600/40 rounded-xl p-2">
              <img src={previewUrl} alt="preview" className="max-h-48 rounded-lg" />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                  className="px-2 py-1 text-sm rounded-md bg-red-600/70 hover:bg-red-600 text-white"
                >
                  Hủy ảnh
                </button>
                <button
                  onClick={handleSendMessage}
                  className="px-2 py-1 text-sm rounded-md bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Gửi ảnh
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === VOICE MODE === */}
        {(isRecording || recordedBlob) ? (
          <div className="w-full rounded-xl border border-purple-500 bg-white/10 p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {isRecording && (
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={60}
                  className="w-full h-[60px] rounded-md bg-black/40 border border-purple-500"
                />
              )}
              <div className={`px-2 py-1 rounded-lg text-xs ${
                isRecording ? "bg-red-500/20 text-red-200" : "bg-purple-500/20 text-purple-200"
              }`}>
                
                {isRecording ? "Đang ghi" : "Xem lại"} • {formatDuration(recordingMs)}
              </div>

              {isRecording && (
                <button
                  onClick={stopRecording}
                  className="px-3 py-2 rounded-lg border border-red-400 text-red-300 hover:text-white"
                  title="Dừng ghi"
                >
                  ■
                </button>
              )}

              {recordedUrl && !isRecording && (
                <>
                  <audio ref={audioRef} preload="metadata" controls className="hidden" />
                  {/* hoặc hiển thị controls nếu bạn muốn */}
                  <audio preload="metadata" className="hidden">
                    <source src={recordedUrl} type="audio/webm;codecs=opus" />
                  </audio>
                  <button
                    onClick={togglePlayPreview}
                    className="px-3 py-2 rounded-lg border border-purple-400 text-purple-200 hover:text-white"
                    title={isPlaying ? "Tạm dừng" : "Phát lại"}
                  >
                    {isPlaying ? "⏸" : "▶"}
                  </button>
                </>
              )}

              <button
                onClick={discardRecorded}
                className="ml-auto px-3 py-2 rounded-lg border border-gray-400 text-gray-200 hover:text-white"
                title="Xoá bản ghi"
              >
                ✕
              </button>

              <button
                onClick={handleSendMessage}
                className="px-3 py-2 bg-gradient-to-r from-fuchsia-500 via-purple-600 to-blue-600 rounded-xl text-white font-bold hover:scale-105 hover:shadow-[0_0_15px_#a855f7]"
                title="Gửi voice"
              >
                ➤
              </button>
            </div>
          </div>
        ) : (
          /* === TEXT/FILE MODE ===  — chỉ 1 lớp, full width */
          <div className="w-full flex items-center gap-2 rounded-xl bg-white/10 border border-purple-500 px-3 py-2">
            <input
              type="text"
              placeholder="Nhập tin nhắn..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              onPaste={handlePaste}
              className="flex-1 bg-transparent text-white placeholder-gray-400 focus:outline-none"
            />
            <label className="cursor-pointer text-purple-300 hover:text-white" title="Đính kèm">
              📎
              <input
                type="file"
                onChange={handleFileChange}
                className="hidden"
                accept="image/*,video/*,audio/*,application/pdf"
              />
            </label>
            <button
              onClick={startRecording}
              className="px-2 py-2 rounded-lg border border-purple-500 text-purple-300 hover:text-white"
              title="Ghi âm"
            >
              🎤
            </button>
            <button
              onClick={handleSendMessage}
              className="px-3 py-2 bg-gradient-to-r from-fuchsia-500 via-purple-600 to-blue-600 rounded-xl text-white font-bold hover:scale-105 hover:shadow-[0_0_15px_#a855f7]"
              title="Gửi"
            >
              ➤
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderFriends = () => {
    if (loading) return <p className="text-gray-300">Đang tải...</p>;
    if (friendsError) return <p className="text-red-400">{friendsError}</p>;
    if (!Array.isArray(friends) || friends.length === 0)
      return <p className="text-gray-400">Không có bạn bè nào.</p>;

    return (
      <div className="rounded-xl p-4 bg-gradient-to-br from-black via-purple-900 to-black shadow-[0_0_15px_#a855f7]">
        <h3 className="text-xl font-bold text-purple-300 mb-4">Danh sách bạn bè</h3>
        <ul className="space-y-3">
          {friends.map((friend) => (
            <li
              key={friend.friendID}
              className="flex items-center justify-between p-2 bg-black/30 rounded-lg hover:bg-purple-900/40 transition"
            >
              <div className="flex items-center gap-3">
                <img
                  src={friend.friendAvatar}
                  alt={friend.friendName}
                  className="w-10 h-10 rounded-full border border-purple-400 object-cover"
                />
                <p className="text-white">{friend.friendName}</p>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 rounded-lg bg-purple-700 text-white hover:bg-purple-600">
                  Nhắn tin
                </button>
                <button
                  className="px-3 py-1 rounded-lg bg-red-700 text-white hover:bg-red-600"
                  onClick={() => handleRemoveFriend(friend.friendID)}
                >
                  Xóa
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderFriendRequests = () => {
    if (loading) return <p className="text-gray-300">Đang tải...</p>;
    if (friendRequestsError) return <p className="text-red-400">{friendRequestsError}</p>;
    if (friendRequests.length === 0) return <p className="text-gray-400">Không có lời mời kết bạn.</p>;

    return (
      <div className="rounded-xl p-4 bg-gradient-to-br from-black via-purple-900 to-black shadow-[0_0_15px_#a855f7]">
        <h3 className="text-xl font-bold text-purple-300 mb-4">Lời mời kết bạn</h3>
        <ul className="space-y-3">
          {friendRequests.map((request) => (
            <li
              key={request.requestID}
              className="flex items-center justify-between p-2 bg-black/30 rounded-lg hover:bg-purple-900/40 transition"
            >
              <div className="flex items-center gap-3">
                <img
                  src={request.friendAvatar}
                  alt={request.friendName}
                  className="w-10 h-10 rounded-full border border-purple-400 object-cover"
                />
                <p className="text-white">{request.friendName}</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-500 text-white"
                  onClick={() => handleAcceptFriendRequest(request.friendID)}
                >
                  Chấp nhận
                </button>
                <button
                  className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white"
                  onClick={() => handleDeclineFriendRequest(request.friendID)}
                >
                  Từ chối
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="column column-3 h-full p-3">
      {mode === "chat" ? (
        currentChannel ? (
          renderChatWindow()
        ) : (
          <div className="h-full flex items-center justify-center text-gray-400">
            Chưa chọn kênh chat nào.
          </div>
        )
      ) : mode === "friends" ? (
        selectedOption === "Danh sách bạn bè" ? (
          renderFriends()
        ) : selectedOption === "Lời mời kết bạn" ? (
          renderFriendRequests()
        ) : (
          <p className="text-gray-400">Chọn một tùy chọn để xem nội dung.</p>
        )
      ) : null}

      <ChannelModal
        modal={modal}
        currentChannel={currentChannel}
        onClose={() => setModal({ type: null, data: null })}
      />
    </div>
  );
};

export default Column3;
