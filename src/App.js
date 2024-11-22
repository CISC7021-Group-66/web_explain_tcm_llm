import { useEffect } from "react";

function App() {

  async function fetchStream() {
    const response = await fetch("http://100.96.0.5:8000/fullQuery", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ question: "张某，男，27岁。患者因昨晚饮酒发热，喝凉水数杯，早晨腹痛腹泻，大便如水色黄，腹中辘辘有声，恶心欲吐，胸中满闷不舒，口干欲冷饮，舌质红、苔白腻，脉沉细数。给出中医诊断和处方建议。" })
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
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold text-blue-500">
        Hello, Tailwind CSS!
      </h1>

      <button onClick={fetchStream}>Fetch Data</button>
    </div>
  );
}

export default App;