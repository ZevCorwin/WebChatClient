import React, { useState, useEffect } from "react";
import ModalBase from "./ModalBase";
import { getUserByID, updateUserProfile } from "../../services/api";

const UpdateProfileModal = ({ isOpen, onClose, userID }) => {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [connectedWith, setConnectedWith] = useState("");
  const [loading, setLoading] = useState(false);

  // Load dữ liệu cũ khi mở modal
  useEffect(() => {
    if (isOpen && userID) {
      (async () => {
        try {
          const user = await getUserByID(userID);
          setName(user.name || "");
          setBirthDate(user.birthDate || "");
          setGender(
            user.gender !== undefined ? user.gender.toString() : ""
          );
          setAddress(user.address || "");
          setMaritalStatus(user.maritalStatus || "");
          setConnectedWith(user.connectedWith || "");
        } catch (err) {
          console.error("[UpdateProfileModal] Lỗi load user:", err);
        }
      })();
    }
  }, [isOpen, userID]);

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const data = {
        name,
        birthDate,
        gender: gender !== "" ? parseInt(gender, 10) : undefined,
        address,
        maritalStatus,
        connectedWith: connectedWith || null,
      };

      await updateUserProfile(userID, data);
      alert("Cập nhật thành công!");
      onClose();
    } catch (err) {
      alert("Lỗi khi cập nhật: " + err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <ModalBase
      title="Cập nhật thông tin cá nhân"
      onClose={onClose}
      onSubmit={handleSubmit}
      disabled={loading}
    >
      <div className="space-y-4">
        {/* Họ và tên */}
        <input
          type="text"
          placeholder="Họ và tên"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />

        {/* Ngày sinh */}
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />

        {/* Giới tính */}
        <select
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        >
          <option value="">Chọn giới tính</option>
          <option value="0">Nam</option>
          <option value="1">Nữ</option>
          <option value="2">Khác</option>
        </select>

        {/* Địa chỉ */}
        <input
          type="text"
          placeholder="Địa chỉ"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />

        {/* Tình trạng hôn nhân */}
        <select
          value={maritalStatus}
          onChange={(e) => setMaritalStatus(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        >
          <option value="">Chọn tình trạng hôn nhân</option>
          <option value="Single">Độc thân</option>
          <option value="Dating">Hẹn hò</option>
          <option value="Married">Kết hôn</option>
        </select>

        {/* Liên kết với */}
        {(maritalStatus === "Dating" || maritalStatus === "Married") && (
          <input
            type="text"
            placeholder="ID hoặc Email người liên kết"
            value={connectedWith}
            onChange={(e) => setConnectedWith(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 text-white"
          />
        )}
      </div>
    </ModalBase>
  );
};

export default UpdateProfileModal;
