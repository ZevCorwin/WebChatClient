import React, { useEffect, useState } from "react";
import { getUserByID } from "../services/api";
import { useNavigate } from "react-router-dom";
import {
  AiOutlineArrowLeft,
  AiOutlineEdit,
  AiOutlineLock,
  AiOutlineLogout,
} from "react-icons/ai";

const ProfilePage = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
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

  // Các nút chức năng
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black text-white">
      {/* Thanh trên cùng */}
      <div className="flex items-center px-6 py-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-purple-300 hover:text-white transition"
        >
          <AiOutlineArrowLeft size={20} />
          <span>Quay lại</span>
        </button>
      </div>

      {/* Avatar + Menu */}
      <div className="flex flex-col items-center pt-6 relative">
        <div
          className="relative w-64 h-64 flex items-center justify-center cursor-pointer"
          onClick={() => setMenuOpen(!menuOpen)}
        >
            {/* Bụi sao tỏa ra ngoài avatar */}
            {!menuOpen && <OuterParticleAura />}
          {/* Container xoay */}
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

          {/* Avatar với hiệu ứng bụi sao */}
          <div
            className={`relative w-32 h-32 rounded-full overflow-hidden z-10 bg-black transition ${
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
    const angle = (i / 30) * 360 + Math.random() * 12 - 6; // phân bố xung quanh
    const distance = 60 + Math.random() * 40; // từ rìa avatar tỏa ra ngoài
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
            //@ts-ignore
            "--angle": `${p.angle}deg`,
          }}
        >
          <span
            className="outer-dot"
            style={{
              //@ts-ignore
              "--distance": `${p.distance}px`,
              //@ts-ignore
              "--delay": `${p.delay}s`,
              //@ts-ignore
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
