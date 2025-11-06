import React from "react";
import { providerOpenUrl } from "../utils/providerOpenUrl";

export default function EmailInfoTip({ email, type = "OTP" }) {
  const url = providerOpenUrl(email);
  const noun = type === "register" ? "OTP đăng ký" : type === "reset" ? "OTP khôi phục" : "OTP";
  return (
    <div className="mb-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200">
      <div className="font-semibold mb-1">Không thấy email {noun}?</div>
      <ul className="list-disc pl-5 space-y-1">
        <li>Kiểm tra mục <b>Spam/Thư rác</b> hoặc <b>Quảng cáo</b>.</li>
        <li>Tìm email có tiêu đề liên quan đến <b>{noun}</b> (có thể hiển thị “via sendgrid.net”).</li>
        <li>Bấm <b>“Not spam / Không phải thư rác”</b> và thêm người gửi vào danh bạ để lần sau vào Hộp thư chính.</li>
      </ul>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-2 rounded bg-yellow-500/20 px-3 py-1 hover:bg-yellow-500/30 underline"
          title="Mở hộp thư nhanh"
        >
          Mở hộp thư của tôi
        </a>
      )}
    </div>
  );
}
