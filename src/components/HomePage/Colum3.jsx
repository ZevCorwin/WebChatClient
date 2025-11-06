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
  recallMessage,
  hideMessageForMe,
  uploadFile,
  toggleReaction,
  editMessage,
  sendTypingEvent,
  wsSendDelivered,
  wsSendRead,
} from "../../services/api";
import { BsThreeDotsVertical, BsArrowLeft } from "react-icons/bs";
import ChannelMenu from "../Channel/ChannelMenu";
import ChannelModal from "../Channel/ChannelModal";
import { FiCornerUpLeft, FiEdit2 } from "react-icons/fi";

const STATUS_RANK = { "Đang gửi":0, "Đã gửi":1, "Đã nhận":2, "Đã xem":3 };
function stageOf(s, fallback = 0) {
  if (typeof s === "number") return s;
  return STATUS_RANK[s] ?? fallback;
}

const Column3 = ({ mode, selectedOption, currentChannel, onBack }) => {
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

  // --- voice ---
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const [recordingStart, setRecordingStart] = useState(null);
  const [recordingMs, setRecordingMs] = useState(0);
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

  // reactions + reply + edit
  const [pickerVisible, setPickerVisible] = useState({ msgId: null, visible: false });
  const [pickerPosition, setPickerPosition] = useState({ left: 0, top: 0, align: "left" });
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  // context menu
  const [ctxMenu, setCtxMenu] = useState({ visible: false, x: 0, y: 0, message: null });

  const [typingUsers, setTypingUsers] = useState([]); // array of { id, name? }
  const [presence, setPresence] = useState(new Map()); // key: userId, val: { online, lastSeen }
  const [peerId, setPeerId] = useState(null);          // id đối phương cho 1-1 (để chấm xanh header)

  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const meRef = React.useRef(sessionStorage.getItem("userID"));
  const scrollBottomRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const deliveredSentRef = useRef(new Set());
  const readSentRef = useRef(new Set());

  const isImage = (f) => f && /^image\//i.test(f.type);
  const formatDuration = (ms) => {
    const sec = Math.floor(ms / 1000);
    const m = String(Math.floor(sec / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  const markDeliveredOnce = React.useCallback((m, channelId, me) => {
  if (m.senderId === me) return;
  const curStage = stageOf(m.statusStage ?? m.status, 0);
  if (curStage >= 2) return; // ≥ Đã nhận
  if (deliveredSentRef.current.has(m.id)) return;
  try {
    wsSendDelivered(m.id, channelId, me);
    deliveredSentRef.current.add(m.id);
  } catch {}
}, []);

const markReadOnce = React.useCallback((m, channelId, me) => {
  if (m.senderId === me) return;
  const curStage = stageOf(m.statusStage ?? m.status, 0);
  if (curStage >= 3) return; // ≥ Đã xem
  if (readSentRef.current.has(m.id)) return;
  try {
    wsSendRead(m.id, channelId, me);
    readSentRef.current.add(m.id);
  } catch {}
}, []);

  const timeAgo = (iso) => {
    try {
      const d = new Date(iso);
      const s = Math.floor((Date.now() - d.getTime()) / 1000);
      if (s < 60) return `${s}s trước`;
      const m = Math.floor(s / 60);
      if (m < 60) return `${m} phút trước`;
      const h = Math.floor(m / 60);
      if (h < 24) return `${h} giờ trước`;
      const d2 = Math.floor(h / 24);
      return `${d2} ngày trước`;
    } catch { return ""; }
  };

  useEffect(() => {
    (async () => {
      try {
        if (!currentChannel?.channelID && !currentChannel?.id) {
          setPeerId(null);
          return;
        }
        const cid = currentChannel.id || currentChannel.channelID;
        const members = await getChannelMembers(cid); // [{ MemberID, Role, ... }]
        const me = sessionStorage.getItem("userID");
        // nếu là kênh 1-1: pick member khác mình làm peerId
        if (Array.isArray(members) && members.length === 2) {
          const other = members.find(m => m.MemberID !== me);
          setPeerId(other?.MemberID || null);
        } else {
          setPeerId(null); // group: không chấm xanh header (có thể làm sau)
        }
      } catch {
        setPeerId(null);
      }
    })();
  }, [currentChannel?.id, currentChannel?.channelID]);

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
    const onEsc = (e) => { if (e.key === "Escape") onDocClick(); };
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // Điều hướng dữ liệu
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

  useEffect(() => {
    deliveredSentRef.current.clear();
    readSentRef.current.clear();
  }, [currentChannel?.id, currentChannel?.channelID]);

  // WebSocket realtime
  useEffect(() => {
    if (!currentChannel) return;
    const currentId = currentChannel.id || currentChannel.channelID;

    const ws = connectWebSocket((incoming) => {
      if (incoming?.type === "presence" && incoming?.userId) {
        setPresence(prev => {
          const next = new Map(prev);
          next.set(incoming.userId, {
            online: !!incoming.online,
            lastSeen: incoming.lastSeen || null,
          });
          return next;
        });
        return;
      }

      if (!incoming?.channelId) return;
      if (incoming.channelId !== currentId) return;

      const stageLabel = ["Đang gửi","Đã gửi","Đã nhận","Đã xem"];

      if (incoming.type === "message_status_update") {
        setMessages(prev => prev.map(m => {
          if (m.id !== incoming.messageId) return m;

          const cur = Number(m.statusStage ?? -1);
          const next = Number(incoming.statusStage ?? -1);

          if (next > cur) {
            return {
              ...m,
              statusStage: next,
              status: stageLabel[next] ?? incoming.status ?? m.status,
            };
          }
          // nếu BE cũ không có statusStage → fallback chuỗi như bạn đang làm
          if (next === -1 && incoming.status) {
            const rank = { "Đang gửi":0, "Đã gửi":1, "Đã nhận":2, "Đã xem":3 };
            const curS = rank[m.status] ?? 0;
            const nextS = rank[incoming.status] ?? 0;
            return nextS > curS ? { ...m, status: incoming.status, statusStage: nextS } : m;
          }
          return m;
        }));
        return;
      }

      if (incoming.type === "message_reaction") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === incoming.messageId
              ? { ...m, reactions: incoming.reactions || [] }
              : m
          )
        );
        return;
      }

      // --- Message edited (UPDATE, không append) ---
      if (incoming.type === "message_updated") {
        console.log("[WS][EDITED]", incoming); // 👀 log BE gửi về
        setMessages(prev =>
          prev.map(m =>
            m.id === incoming.id
              ? {
                  ...m,
                  content: incoming.content,
                  edited: true,
                  editedAt: incoming.editedAt || new Date().toISOString(),
                  senderId: incoming.senderId || m.senderId,
                  senderName: incoming.senderName ?? m.senderName,
                  senderAvatar: incoming.senderAvatar ?? m.senderAvatar,
                  messageType: incoming.messageType || m.messageType,
                  timestamp: incoming.timestamp || m.timestamp,
                }
              : m
          )
        );
        return; // ❗️ĐỪNG append
      }

      if (incoming.type === "message_recalled") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === incoming.messageId
              ? { ...m, recalled: true, content: "" }
              : m
          )
        );
        return;
      }

      if (incoming.type === "typing") {
        // Nếu là event typing
        const senderId = incoming.senderId;
        const senderName = incoming.senderName || null;
        const isTyping = !!incoming.isTyping;

        if (senderId === meRef.current) return;

        setTypingUsers(prev => {
          // remove existing same sender
          const filtered = prev.filter(u => u.id !== senderId);
          if (isTyping) {
            // thêm lại (đặt ở cuối)
            return [...filtered, { id: senderId, name: senderName }];
          } else {
            return filtered;
          }
        });
        return;
      }

      const standardizedMessage = {
        id: incoming.id || Math.random().toString(36).substring(7),
        content: incoming.content ?? "",
        timestamp: incoming.timestamp || new Date().toISOString(),
        messageType: incoming.messageType || "Text",
        senderId: incoming.senderId || "Unknown",
        senderName: incoming.senderName || "Người gửi",
        senderAvatar: incoming.senderAvatar || "/default-avatar.png",
        status: incoming.status || "Đang gửi",
        statusStage: typeof incoming.statusStage === "number"
                ? incoming.statusStage
                : ({"Đang gửi":0,"Đã gửi":1,"Đã nhận":2,"Đã xem":3}[incoming.status] ?? 0),
        recalled: !!incoming.recalled,
        url: incoming.url || null,
        fileId: incoming.fileId || null,
        channelId: incoming.channelId,
        reactions: incoming.reactions || [],
        // hỗ trợ cả dạng reply embed và reply id
        reply: incoming.reply || null,
        replyId: incoming.replyId || incoming.replyTo || null,
      };

      console.log("[WS][PARSED]", standardizedMessage);
      setMessages((prev) => [...prev, standardizedMessage]);
      
      const me = meRef.current;
        if (standardizedMessage.senderId && standardizedMessage.senderId !== me) {
          const chId = standardizedMessage.channelId;
          markDeliveredOnce(standardizedMessage, chId, me);
          // tuỳ UX: nếu muốn auto "Đã xem", chỉ đọc 1 lần
          setTimeout(() => markReadOnce(standardizedMessage, chId, me), 300);
        }
      });

    return () => ws.close();
  }, [currentChannel, markDeliveredOnce, markReadOnce]);

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
      const norm = list.map(m => ({
        ...m,
        id: m.id || m._id || m.ID,                  // 👈 đảm bảo luôn có id
        senderId: m.senderId || m.SenderID || m.senderID
      }));
      setMessages(norm);
      try {
        const me = sessionStorage.getItem("userID");
        const chId = channelID; // chính là param truyền vào

        // Gửi "ĐÃ NHẬN" và (tuỳ UX) "ĐÃ XEM" dựa trên dữ liệu đã chuẩn hoá
        norm.forEach(m => markDeliveredOnce(m, chId, me));
        // 👉 nếu không muốn auto-đánh dấu đã xem lịch sử, comment dòng dưới
        norm.forEach(m => markReadOnce(m, chId, me));
        } catch {}
        setMessagesError("");
    } catch (err) {
      setMessages([]);
      setMessagesError("Không thể tải tin nhắn: " + (err?.message || "Unknown error"));
    }
  };

  // Resolve reply (nếu BE chỉ trả replyId)
  useEffect(() => {
    if (!messages?.length) return;
    const map = new Map(messages.map((m) => [m.id, m]));
    const next = messages.map((m) => {
      if (!m.reply && m.replyId && map.has(m.replyId)) {
        return { ...m, reply: map.get(m.replyId) };
      }
      return m;
    });
    // chỉ set lại nếu có thay đổi để tránh re-render loop
    const changed = next.some((m, i) => m !== messages[i]);
    if (changed) setMessages(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const handleSendMessage = async () => {
    if (!currentChannel || (!currentChannel.id && !currentChannel.channelID)) {
      setNewMessageError("Không thể gửi: kênh không hợp lệ.");
      return;
    }

    // --- Edit: chỉ cho phép Text ---
    if (editingMessage) {
      const mt = String(editingMessage.messageType || "Text").toLowerCase();
      if (mt !== "text") {
        console.error("[Edit] Tried to edit non-text message:", editingMessage);
        setNewMessageError("Chỉ có thể chỉnh sửa tin nhắn văn bản.");
        setEditingMessage(null);
        setNewMessage("");
        return;
      }
      try {
        const res = await editMessage(editingMessage.id, newMessage);
        console.log("[EditMessage] Response:", res);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessage.id ? { ...m, content: newMessage } : m
          )
        );
        setEditingMessage(null);
        setNewMessage("");
        setNewMessageError("");
        return;
      } catch (err) {
        console.error("[Edit error]", err);
        setNewMessageError("Không thể chỉnh sửa tin nhắn.");
        return;
      }
    }

    try {
      // Voice
      if (recordedBlob) {
        const voiceFile = new File([recordedBlob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        const uploaded = await uploadFile(voiceFile);
        await sendWebSocketMessage(
          currentChannel.id || currentChannel.channelID,
          uploaded.url,
          "Voice",
          replyingTo?.id
        );
        discardRecorded();
        setNewMessageError("");
        return;
      }

      // File
      if (selectedFile) {
        const uploaded = await uploadFile(selectedFile);
        await sendWebSocketMessage(
          currentChannel.id || currentChannel.channelID,
          uploaded.url,
          "File",
          replyingTo?.id
        );
        setSelectedFile(null);
        setPreviewUrl(null);
        setNewMessageError("");
        return;
      }

      // Text
      if (!newMessage.trim()) return;
      await sendWebSocketMessage(
        currentChannel.id || currentChannel.channelID,
        newMessage,
        "Text",
        replyingTo?.id
      );
      setNewMessage("");
      setReplyingTo(null);
      setNewMessageError("");
    } catch (err) {
      console.error("[Send error]", err);
      setNewMessageError("Không thể gửi.");
    }
  };

  // File select
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX = 25 * 1024 * 1024; // 25MB
    if (file.size > MAX) {
      alert("Kích thước file vượt quá 25MB!");
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
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

  // Voice record
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      await audioCtx.resume();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;
      setAudioContext(audioCtx);

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

        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = "rgba(168,85,247,0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();

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
      rafRef.current = requestAnimationFrame(drawVisualizer);

      const mr = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mr;

      chunksRef.current = [];
      setRecordingMs(0);
      setRecordingStart(Date.now());
      setRecordedBlob(null);
      setRecordedUrl(null);
      setIsRecording(true);

      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        try {
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
  const isMine = (msg) => msg?.senderId?.toString() === meRef.current?.toString();

  // Context menu
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

  const RECALL_WINDOW_MS = 2 * 60 * 1000;
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
      const meId = sessionStorage.getItem("userID");
      const myMember = members.find((m) => m.MemberID === meId);
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

  // Reaction picker
  const openReactionPicker = (msgId, e) => {
    e?.stopPropagation();
    const host = listRef.current;
    if (!host) return;

    const hostRect = host.getBoundingClientRect();
    const targetRect = e.currentTarget.getBoundingClientRect();
    const left = targetRect.left - hostRect.left + host.scrollLeft;
    const top = targetRect.top - hostRect.top + host.scrollTop;
    const align = left > hostRect.width / 2 ? "right" : "left";

    setPickerVisible({ msgId, visible: true });
    setPickerPosition({ left, top, align });
  };

  const handleToggleReaction = async (messageId, emoji) => {
    try {
      await toggleReaction(messageId, emoji);
    } catch (err) {
      console.error("[handleToggleReaction] Lỗi:", err);
    } finally {
      setPickerVisible({ msgId: null, visible: false });
    }
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setNewMessage(text);

    // gửi typing = true khi bắt đầu gõ
    if (!isTypingRef.current) {
      try {
        sendTypingEvent(currentChannel.id || currentChannel.channelID, true);
      } catch (err) {
        // ignore
      }
      isTypingRef.current = true;
    }

    // reset timeout: nếu không có activity trong 1200ms => gửi typing = false
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      try {
        sendTypingEvent(currentChannel.id || currentChannel.channelID, false);
      } catch (err) {
        // ignore
      }
      isTypingRef.current = false;
      typingTimeoutRef.current = null;
    }, 1200);
  };

  // UI
  const renderChatWindow = () => (
    <div className="flex h-full flex-col rounded-xl p-4 bg-gradient-to-br from-black via-purple-900 to-black shadow-[0_0_20px_#a855f7]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-purple-700 pb-3 mb-3">
        <button 
          onClick={onBack} 
          className="p-2 rounded-full hover:bg-purple-700/30 transition lg:hidden"
        >
          <BsArrowLeft className="w-6 h-6 text-gray-200" /> Hello
        </button>
        <div className="relative">
          <img
            src={currentChannel?.userAvatar || currentChannel?.channelAvatar}
            alt={currentChannel?.userName || currentChannel?.channelName || "Channel"}
            className="w-10 h-10 rounded-full border border-purple-400 object-cover"
          />
          {/* Dot chỉ hiển thị khi có peerId (kênh 1-1) */}
          {peerId && (() => {
            const p = presence.get(peerId);
            const isOnline = !!p?.online;
            return (
              <span
                className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${isOnline ? "bg-green-500" : "bg-gray-500"}`}
                title={isOnline ? "Đang hoạt động" : (p?.lastSeen ? `Hoạt động ${timeAgo(p.lastSeen)}` : "Ngoại tuyến")}
              />
            );
          })()}
        </div>

        <div>
          <h3 className="text-lg font-bold text-purple-300">
            {currentChannel?.channelName || currentChannel?.userName || "Không tên"}
          </h3>
          <p className="text-xs text-gray-400">
            {/* Subtitle: online/offline cho 1-1; còn group giữ nguyên type */}
            {peerId
              ? (() => {
                  const p = presence.get(peerId);
                  if (p?.online) return "Đang hoạt động";
                  if (p?.lastSeen) return `Hoạt động ${timeAgo(p.lastSeen)}`;
                  return "Ngoại tuyến";
                })()
              : (currentChannel?.channelType || "")}
          </p>
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
                key={msg.id}
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
                    className={`relative group px-3 py-2 rounded-2xl text-sm text-white shadow transition select-text
                      ${
                        mine
                          ? "bg-gradient-to-r from-fuchsia-600 via-purple-600 to-blue-600 shadow-[0_0_12px_#a855f7]"
                          : "bg-purple-700/30 border border-purple-500/40"
                      } ${isRecalled ? "opacity-70" : ""}`}
                  >
                    {/* Hover actions: đặt cạnh bong bóng, hướng vào trung tâm */}
                    <div
                      className={[
                        "pointer-events-none",
                        "absolute top-1/2 -translate-y-1/2",
                        "flex gap-2 opacity-0 group-hover:opacity-100 transition z-10",
                        mine ? "right-full mr-2" : "left-full ml-2",
                      ].join(" ")}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); }}
                        title="Trả lời tin nhắn"
                        className="pointer-events-auto w-8 h-8 rounded-full border border-white/20 bg-black/60 backdrop-blur-sm shadow-lg hover:scale-110 hover:bg-white/20 transition flex items-center justify-center"
                      >
                        <FiCornerUpLeft className="w-4 h-4 text-white" />
                      </button>

                      {mine && !msg.recalled && msg.messageType === "Text" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewMessage(msg.content);
                            setReplyingTo(null);
                            setEditingMessage(msg);
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                          title="Chỉnh sửa tin nhắn"
                          className="pointer-events-auto w-8 h-8 rounded-full border border-white/20 bg-black/60 backdrop-blur-sm shadow-lg hover:scale-110 hover:bg-white/20 transition flex items-center justify-center"
                        >
                          <FiEdit2 className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </div>

                    {/* Nếu tin nhắn này là reply → trích dẫn mờ giống Messenger/Zalo */}
                    {(msg.reply || msg.replyId) && (
                      <div className="mb-1 p-2 rounded-lg bg-white/5 border border-white/10 backdrop-blur-sm">
                        <div className="text-[11px] text-purple-300 mb-1 flex items-center gap-1">
                          <span className="opacity-80">↪</span>
                          <span>Trả lời</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1 rounded bg-purple-500/60 mt-0.5" />
                          <div className="text-xs text-gray-200/90 max-w-[34ch] line-clamp-2">
                            {(msg.reply || msg.replyId).recalled ? (
                              <span className="italic text-gray-400">Tin nhắn đã bị thu hồi</span>
                            ) : (msg.reply || msg.replyId).messageType === "Voice" ? (
                              <span>🎤 Voice message</span>
                            ) : (msg.reply || msg.replyId).messageType === "File" ? (
                              <span>📎 Tệp đính kèm</span>
                            ) : (
                              <span>{(msg.reply || msg.replyId).content}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Nội dung tin nhắn */}
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

                    <div className="text-[10px] text-gray-300 mt-1 text-right flex items-center gap-1">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                      {isMine(msg) && (
                        <span className="ml-1 text-xs text-gray-400">
                          {msg.status === "Đang gửi" ? "⏳" :
                          msg.status === "Đã gửi"  ? "✓"  :
                          msg.status === "Đã nhận" ? "✓✓" :
                          msg.status === "Đã xem"  ? "✓✓👀" : ""}
                        </span>
                      )}
                    </div>

                    {/* Reactions */}
                    <div className="flex gap-1 mt-1 flex-wrap items-center">
                      {Array.isArray(msg.reactions) && msg.reactions.length > 0 &&
                        msg.reactions.map((r, idx) => {
                          const userIDs = r.userIDs || [];
                          const mineReact = userIDs.includes(meRef.current);
                          const count = userIDs.length;
                          return (
                            <button
                              key={idx}
                              onClick={() => handleToggleReaction(msg.id, r.emoji)}
                              title={count > 0 ? `Đã thả bởi ${count} người dùng` : "Không có ai thả"}
                              className={`px-2 py-1 text-sm rounded-full border transition-transform duration-150 flex items-center gap-1 ${
                                mineReact
                                  ? "bg-purple-600 text-white border-purple-400 scale-105"
                                  : "bg-transparent text-purple-300 border-purple-400/40 hover:scale-110"
                              } hover:bg-purple-500/30`}
                            >
                              <span>{r.emoji}</span>
                              {count > 1 && <span className="text-xs">{count}</span>}
                            </button>
                          );
                        })}
                      <button
                        onClick={(e) => openReactionPicker(msg.id, e)}
                        className="text-xs text-gray-400 hover:text-white ml-1"
                        title="Thả cảm xúc khác"
                      >
                        ➕
                      </button>
                    </div>

                    {/* Emoji mini picker */}
                    {pickerVisible.visible && pickerVisible.msgId === msg.id && (
                      <div
                        className={`absolute z-50 bg-[#1a1426] border border-purple-700 rounded-xl p-2 shadow-xl text-2xl flex gap-1 ${
                          pickerPosition.align === "right" ? "right-0" : "left-0"
                        }`}
                      >
                        {["😀", "😂", "❤️", "👍", "🔥", "😢", "😮", "😡"].map((e) => (
                          <button
                            key={e}
                            onClick={() => handleToggleReaction(pickerVisible.msgId, e)}
                            className="p-1 hover:scale-125 transition-transform"
                          >
                            {e}
                          </button>
                        ))}
                        <button
                          onClick={() => setPickerVisible({ msgId: null, visible: false })}
                          className="ml-2 text-sm text-gray-400 hover:text-white"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-400 italic">Chưa có tin nhắn</p>
        )}

        {/* Context menu */}
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
                      ? "text-gray-400 cursor-not-allowed opacity-60"
                      : "text-red-400 font-semibold"
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
              {isRecallExpired(ctxMenu.message) ? "Thu hồi (hết hạn)" : "Thu hồi tin nhắn"}
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
        {/* Khung preview trả lời */}
        {replyingTo && (
          <div className="mb-2 p-2 bg-purple-900/40 border border-purple-500/50 rounded-lg">
            <div className="text-xs text-purple-300 mb-1">Đang trả lời:</div>
            <div className="p-2 rounded-md bg-white/5 border border-white/10">
              <div className="flex gap-2">
                <div className="w-1 bg-purple-500/60 rounded" />
                <div className="text-xs text-gray-200/90 max-w-[80ch]">
                  {replyingTo.recalled ? (
                    <span className="italic text-gray-400">Tin nhắn đã bị thu hồi</span>
                  ) : replyingTo.messageType === "Voice" ? (
                    <span>🎤 Voice message</span>
                  ) : replyingTo.messageType === "File" ? (
                    <span>📎 Tệp đính kèm</span>
                  ) : (
                    <span>{replyingTo.content}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-1">
              <button
                onClick={() => setReplyingTo(null)}
                className="text-gray-400 hover:text-white text-sm"
                title="Hủy trả lời"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Khung “Đang chỉnh sửa” */}
        {editingMessage && (
          <div className="mb-2 p-2 bg-blue-900/40 border border-blue-500/50 rounded-lg flex justify-between items-center">
            <div className="flex flex-col text-sm text-gray-200">
              <span className="text-xs text-blue-300">Đang chỉnh sửa:</span>
              <span className="line-clamp-1">{editingMessage.content}</span>
            </div>
            <button
              onClick={() => setEditingMessage(null)}
              className="text-gray-400 hover:text-white text-sm"
              title="Hủy chỉnh sửa"
            >
              ✕
            </button>
          </div>
        )}

        {newMessageError && <p className="text-red-400 text-sm mb-2">{newMessageError}</p>}

        {/* Preview ảnh */}
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

        {/* VOICE MODE */}
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
                  <button
                    onClick={() => {
                      const a = audioRef.current;
                      if (!a) return;
                      a.paused ? a.play() : a.pause();
                    }}
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
          // TEXT/FILE MODE
          <div className="w-full flex items-center gap-2 rounded-xl bg-white/10 border border-purple-500 px-3 py-2">
            {typingUsers.length > 0 && (
              <div className="text-sm text-gray-300 italic mb-1">
                {typingUsers.length === 1
                  ? `${typingUsers[0].name || "Đối phương"} đang nhập...`
                  : `${typingUsers.length} người đang nhập...`}
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              placeholder="Nhập tin nhắn..."
              value={newMessage}
              onChange={handleInputChange}
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
