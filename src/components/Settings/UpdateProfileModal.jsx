import React, { useState } from "react";
import ModalBase from "./ModalBase";

const UpdateProfileModal = ({ isOpen, onClose }) => {
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");

  if (!isOpen) return null;

  return (
    <ModalBase title="Cập nhật thông tin cá nhân" onClose={onClose} onSubmit={() => alert("Submit cập nhật thông tin")}>
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Họ và tên"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
        <input
          type="date"
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
        <input
          type="text"
          placeholder="Giới tính"
          value={gender}
          onChange={(e) => setGender(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
        <input
          type="text"
          placeholder="Địa chỉ"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
      </div>
    </ModalBase>
  );
};

export default UpdateProfileModal;
