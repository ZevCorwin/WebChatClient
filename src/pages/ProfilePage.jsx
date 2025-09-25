import React, { useEffect, useState } from "react";
import { getUserByID, updateAvatar, updateCoverPhoto, setDefaultAvatar } from "../services/api";
import { useNavigate } from "react-router-dom";
import {
  AiOutlineArrowLeft,
  AiOutlineEdit,
  AiOutlineLock,
  AiOutlineLogout,
  AiOutlineCamera,
} from "react-icons/ai";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCoverMenu, setShowCoverMenu] = useState(false);
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userID = sessionStorage.getItem("userID");
        if (!userID) return;

        const res = await getUserByID(userID);
        const u = res?.user || res || {};

        let avatarUrl = u.avatar || "";
        if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
          const API_BASE =
            process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";
          avatarUrl = API_BASE + avatarUrl;
        }

        setUser({ ...u, avatar: avatarUrl });
      } catch (err) {
        console.error("Lỗi load user:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-purple-300">
        Đang tải...
      </div>
    );
  if (!user)
    return (
      <div className="h-screen flex items-center justify-center text-red-400">
        Không tìm thấy thông tin người dùng
      </div>
    );

  const menuItems = [
    {
      name: "Thông tin cá nhân",
      icon: <AiOutlineEdit />,
      color: "bg-fuchsia-600/80",
      action: () =>
        alert("Cập nhật Tên, Giới tính, Ngày sinh, Địa chỉ, Hôn nhân"),
    },
    {
      name: "Cài Đặt",
      icon: <AiOutlineLock />,
      color: "bg-blue-600/80",
      action: () => navigate("/settings"),
    },
    {
      name: "Đăng xuất",
      icon: <AiOutlineLogout />,
      color: "bg-red-600/80",
      action: () => {
        sessionStorage.clear();
        navigate("/login");
      },
    },
  ];

  const handleSetDefaultAvatar = async () => {
    const userID = sessionStorage.getItem("userID");
    if (!userID) return;

    try {
      const res = await setDefaultAvatar(userID);
      setUser((prev) => ({ ...prev, avatar: res.avatar }));
      alert("Đã đặt lại avatar mặc định!");
    } catch (err) {
      console.error("FE Error:", err);
      alert("Lỗi khi đặt avatar mặc định: " + err.message);
    }
  };

  const handleChangeAvatar = async () => {
    const userID = sessionStorage.getItem("userID");
    if (!userID) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const res = await updateAvatar(userID, file);
        setUser((prev) => ({ ...prev, avatar: res.avatar }));
        alert("Cập nhật avatar thành công!");
      } catch (err) {
        alert("Lỗi khi cập nhật avatar: " + err);
      }
    };
    input.click();
  };

  const handleChangeCover = async () => {
    const userID = sessionStorage.getItem("userID");
    if (!userID) return;

    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const res = await updateCoverPhoto(userID, file);
        setUser((prev) => ({ ...prev, coverPhoto: res.coverPhoto }));
        alert("Cập nhật ảnh bìa thành công!");
      } catch (err) {
        alert("Lỗi khi cập nhật ảnh bìa: " + err);
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black text-white">
      {/* Header */}
      <div className="flex items-center px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-purple-300 hover:text-white transition"
        >
          <AiOutlineArrowLeft size={20} />
          <span>Quay lại</span>
        </button>
      </div>

      {/* Cover Photo */}
      <div
        className="relative w-full h-[360px] bg-gradient-to-br from-black via-purple-900 to-black"
        onMouseEnter={() => setShowCoverMenu(true)}
        onMouseLeave={() => setShowCoverMenu(false)}
      >
        {user.coverPhoto ? (
          <img
            src={user.coverPhoto}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            Chưa có ảnh bìa
          </div>
        )}

        {showCoverMenu && (
          <div className="absolute top-4 right-4 flex gap-3">
            <button
              onClick={handleChangeCover}
              className="bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded flex items-center gap-2"
            >
              <AiOutlineCamera /> Đổi ảnh bìa
            </button>

            {/* Dropdown avatar */}
            <div className="relative">
              <button
                onClick={() => setShowAvatarDropdown(!showAvatarDropdown)}
                className="bg-black/50 hover:bg-black/70 text-white px-3 py-1 rounded flex items-center gap-2"
              >
                <AiOutlineCamera /> Avatar
              </button>

              {showAvatarDropdown && (
                <div className="absolute right-0 mt-2 bg-black/90 rounded shadow-lg z-20">
                  <button
                    onClick={handleChangeAvatar}
                    className="block px-4 py-2 text-sm hover:bg-purple-700 w-full text-left"
                  >
                    Tải ảnh mới
                  </button>
                  <button
                    onClick={handleSetDefaultAvatar}
                    className="block px-4 py-2 text-sm hover:bg-purple-700 w-full text-left"
                  >
                    Dùng ảnh mặc định
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Avatar + Menu */}
      <div className="flex flex-col items-center relative -mt-20">
        <div
          className="relative w-40 h-40 flex items-center justify-center cursor-pointer"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {!menuOpen && <OuterParticleAura />}
          <div
            className={`absolute inset-0 flex items-center justify-center ${
              menuOpen ? "animate-open" : "animate-close"
            }`}
          >
            {menuItems.map((item, i) => {
              const angle = (i / menuItems.length) * 360;
              return (
                <button
                  key={i}
                  onClick={item.action}
                  className={`${item.color} absolute w-24 h-24 rounded-full text-white shadow-lg flex flex-col items-center justify-center text-xs`}
                  style={{
                    transform: `rotate(${angle}deg) translate(120px) rotate(-${angle}deg)`,
                  }}
                >
                  <div className="text-lg">{item.icon}</div>
                  <span className="mt-1 text-center">{item.name}</span>
                </button>
              );
            })}
          </div>

          <div
            className={`relative w-40 h-40 rounded-full overflow-hidden z-10 bg-black transition ${
              menuOpen
                ? "border-4 border-purple-400 shadow-purple-400/50"
                : "glow-star"
            }`}
          >
            <img
              src={user.avatar || "/default-avatar.png"}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Tên & thông tin cơ bản */}
        <h2 className="text-2xl font-bold text-purple-300 mt-6">
          {user.name || "Không tên"}
        </h2>
        <p className="text-gray-400">{user.email}</p>
        <p className="text-gray-400">{user.phone}</p>
      </div>

      {/* Thông tin chi tiết */}
      <div className="mt-10 px-6 max-w-3xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InfoBox label="Địa chỉ" value={user.address || "Chưa cập nhật"} />
          <InfoBox label="Ngày sinh" value={user.birthDate || "Chưa cập nhật"} />
          <InfoBox label="Giới tính" value={user.gender || "Chưa cập nhật"} />
          <InfoBox
            label="Tình trạng hôn nhân"
            value={user.maritalStatus || "Chưa cập nhật"}
          />
          <InfoBox
            label="Ngày tạo tài khoản"
            value={
              user.accountCreatedDate
                ? new Date(user.accountCreatedDate).toLocaleDateString()
                : "Không rõ"
            }
          />
        </div>
      </div>
    </div>
  );
};

const InfoBox = ({ label, value }) => (
  <div className="p-4 bg-black/40 rounded-xl border border-purple-600/30">
    <p className="text-gray-400 text-sm">{label}</p>
    <p className="text-lg font-semibold">{value}</p>
  </div>
);

const OuterParticleAura = () => {
  const particles = Array.from({ length: 30 }).map((_, i) => {
    const angle = (i / 30) * 360 + Math.random() * 12 - 6;
    const distance = 60 + Math.random() * 40;
    const delay = Math.random() * 1.5;
    const size = 2 + Math.random() * 3;
    const dur = 1.8 + Math.random() * 0.8;
    return { angle, distance, delay, size, dur };
  });

  return (
    <div className="absolute inset-0 pointer-events-none">
      {particles.map((p, idx) => (
        <div
          key={idx}
          className="outer-ray"
          style={{
            "--angle": `${p.angle}deg`,
          }}
        >
          <span
            className="outer-dot"
            style={{
              "--distance": `${p.distance}px`,
              "--delay": `${p.delay}s`,
              "--dur": `${p.dur}s`,
              width: p.size,
              height: p.size,
            }}
          />
        </div>
      ))}
    </div>
  );
};

export default ProfilePage;
