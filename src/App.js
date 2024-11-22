import { useState } from "react";

function App() {
  const [inputValue, setInputValue] = useState("张某，男，27岁。患者因昨晚饮酒发热，喝凉水数杯，早晨腹痛腹泻，大便如水色黄，腹中辘辘有声，恶心欲吐，胸中满闷不舒，口干欲冷饮，舌质红、苔白腻，脉沉细数。给出中医诊断和处方建议。");
  // 于某，男，62岁。患冠心病两年，服西药治疗，一日三次，从未有断，然胸憋心悸，一直不止。近月余，每至夜则咳嗽哮喘，痰涎清稀如水，倚息不能平卧，胸憋心悸尤甚。白昼则症状减轻。询知腰脊酸困，背畏风寒，时眩晕，手足心微热，口渴欲饮，但不多饮，亦不思冷，纳便尚可，舌尖略红，苔白腻，脉沉缓。给出中医诊断和处方建议。

  async function simpleAsk() {
    try {
      const response = await fetch("http://100.96.0.5:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: inputValue }),
      });
  
      // 檢查 HTTP 狀態碼
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      // 解析 JSON 響應
      const result = await response.json();
      console.log(result);
    } catch (error) {
      console.error("請求失敗:", error.message);
    }
  }

  async function fetchStream() {
    // 修改此處ip為server ip
    const response = await fetch("http://100.96.0.5:8000/fullQuery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: inputValue })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = ""; // 用於存儲不完整的 JSON 數據

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 解碼當前 chunk 並將其追加到緩衝區
        buffer += decoder.decode(value, { stream: true });

        // 按換行符分割數據
        const lines = buffer.split("\n");

        // 保留最後一行（可能是不完整的 JSON）
        buffer = lines.pop();

        // 處理每一行完整的 JSON
        for (const line of lines) {
            if (line.trim()) { // 確保行不為空
                try {
                    const data = JSON.parse(line);
                    console.log("Parsed data:", data);
                } catch (err) {
                    console.error("Failed to parse JSON:", err, "Line:", line);
                }
            }
        }
    }

    // 如果最後仍有未處理的數據，嘗試解析
    if (buffer.trim()) {
        try {
            const data = JSON.parse(buffer);
            console.log("Parsed final data:", data);
        } catch (err) {
            console.error("Failed to parse final JSON:", err, "Buffer:", buffer);
        }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">中醫藥大語言模型可解釋分析系統</h1>
      <textarea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="mb-4 p-2 border border-gray-300 rounded resize"
        placeholder="Enter your question"
        rows="5"
        cols="50"
      />

      <button
        onClick={() => simpleAsk()}
        className="p-2 bg-blue-500 text-white rounded"
      >
        簡單提問
      </button>
      <button
        onClick={() => fetchStream()}
        className="p-2 bg-blue-500 text-white rounded"
      >
        完整提問&分析
      </button>
    </div>
  );
}

export default App;