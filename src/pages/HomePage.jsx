// File: src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback } from "react";
import "../css/HomePage.css";
import Column1 from "../components/HomePage/Colum1";
import Column2 from "../components/HomePage/Colum2";
import Column3 from "../components/HomePage/Colum3";

const HomePage = () => {
  const [mode, setMode] = useState("chat");
  const [currentChannel, setCurrentChannel] = useState(null);
  const [selectedOption, setSelectedOption] = useState("Chat");

  // Reset khi đổi mode
  useEffect(() => {
    if (mode === "friends") {
      setSelectedOption("Danh sách bạn bè");
      setCurrentChannel(null);
    } else if (mode === "chat") {
      setSelectedOption("Chat");
    }
  }, [mode]);

  // Load lại channel khi F5
  useEffect(() => {
    const saved = sessionStorage.getItem("currentChannel");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCurrentChannel(parsed);
      } catch (e) {
        console.error("[HomePage] parse currentChannel error:", e);
        sessionStorage.removeItem("currentChannel");
      }
    }
  }, []);

  // Lưu channel mỗi khi đổi
  useEffect(() => {
    if (currentChannel) {
      sessionStorage.setItem("currentChannel", JSON.stringify(currentChannel));
    } else {
      sessionStorage.removeItem("currentChannel");
    }
  }, [currentChannel]);

  const handleModeChange = useCallback((newMode) => {
    console.log(`[HomePage] mode -> ${newMode}`);
    setMode(newMode);
  }, []);

  const handleSelectOption = useCallback((option, channel) => {
    console.log("[HomePage] handleSelectOption:", option, channel);
    setSelectedOption(option);
    if (option === "Chat" && channel) {
      setCurrentChannel(channel);
    }
  }, []);

  // Cho Column3 gọi khi bấm nút Back
  const handleBack = useCallback(() => {
    setCurrentChannel(null);
  }, []);

  return (
    <div className="home-page">
      {/* Màn hình danh sách (Col1 + Col2) */}
      <div className={`${currentChannel ? "hidden" : "flex"} lg:flex flex-shrink-0`}>
        <Column1 setMode={handleModeChange} resetToDefault={() => setMode("chat")} />
      </div>

      <div
        className={`${currentChannel ? "hidden" : "flex"} lg:flex w-full flex-col lg:w-auto lg:max-w-sm xl:max-w-md`}
      >
        <Column2
          mode={mode}
          onSelectOption={handleSelectOption}
          setCurrentChannel={setCurrentChannel}
        />
      </div>

      {/* Màn hình chat (Col3) */}
      <div className={`${currentChannel ? "flex" : "hidden"} lg:flex w-full flex-1`}>
        <Column3
          mode={mode}
          selectedOption={selectedOption}
          currentChannel={currentChannel}
          onBack={handleBack}
        />
      </div>
    </div>
  );
};

export default HomePage;
