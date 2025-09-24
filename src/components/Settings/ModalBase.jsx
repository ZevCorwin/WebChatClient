import React from "react";

const ModalBase = ({ title, children, onClose, onSubmit }) => {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl shadow-lg w-full max-w-md p-6 relative">
        {/* Nút đóng */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          ✕
        </button>

        {/* Tiêu đề */}
        <h2 className="text-xl font-bold mb-4 text-purple-300">{title}</h2>

        {/* Nội dung */}
        {children}

        {/* Submit */}
        {onSubmit && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={onSubmit}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg"
            >
              Xác nhận
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalBase;
