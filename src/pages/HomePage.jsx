import React, { useState } from "react";
import "../css/HomePage.css";
import Column1 from "../components/HomePage/Column1";
import Column2 from "../components/HomePage/Column2";
import Column3 from "../components/HomePage/Column3";

const HomePage = () => {
  const [mode, setMode] = useState("chat");
  const resetToDefault = () => setMode("chat");
  const [selectedOption, setSelectedOption] = useState("Danh sách bạn bè");

  return (
    <div className="home-page">
      <Column1 setMode={setMode} resetToDefault={resetToDefault} />
      <Column2 mode={mode} onSelectOption={setSelectedOption} />
      <Column3 mode={mode} selectedOption={selectedOption} />
    </div>
  );
};

export default HomePage;