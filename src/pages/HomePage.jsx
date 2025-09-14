import React, { useState, useEffect, useCallback } from "react";
import "../css/HomePage.css";
import Column1 from "../components/HomePage/Colum1";
import Column2 from "../components/HomePage/Colum2";
import Column3 from "../components/HomePage/Colum3";

const HomePage = () => {
  const [mode, setMode] = useState("chat");
  const [currentChannel, setCurrentChannel] = useState(null);
  const [selectedOption, setSelectedOption] = useState("Chat");

  // Reset cột 3 khi chế độ thay đổi
  useEffect(() => {
    if (mode === "friends") {
      setSelectedOption("Danh sách bạn bè");
      setCurrentChannel(null);
    } else if (mode === "chat") {
        setSelectedOption("Chat");
    } 
  }, [mode]);

  const handleModeChange = (newMode) => {
    console.log(`Đang ở chế độ ${newMode}`);
    setMode(newMode);
  };

  const handleSelectOption = useCallback((option, channel) => {
    console.log("[HomePage] handleSelectOption:", option, channel);
    setSelectedOption(option);
    if (option === "Chat" && channel) {
      setCurrentChannel(channel);
    }
  }, []);

  return (
    <div className="home-page">
      <Column1 setMode={handleModeChange} resetToDefault={() => setMode("chat")} />
      <Column2 mode={mode} onSelectOption={handleSelectOption} setCurrentChannel={setCurrentChannel} />
      <Column3 mode={mode} selectedOption={selectedOption} currentChannel={currentChannel} />
    </div>
  );
};

export default HomePage;