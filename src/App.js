import { useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from "chart.js";

// 註冊 Chart.js 模塊
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

const ImpactChart = ({ words, weights }) => {
  // 配置數據
  const data = {
    labels: words, // y 軸的詞語
    datasets: [
      {
        label: "影響度",
        data: weights, // 條形圖的數值
        backgroundColor: "skyblue", // 條形顏色
      },
    ],
  };

  // 配置選項
  const options = {
    indexAxis: "y", // 將條形圖設置為水平
    scales: {
      x: {
        beginAtZero: true, // x 軸從 0 開始
        title: {
          display: true, // 顯示 X 軸標題
          text: "詞語對問診結果影響度(正負相關)", // 設置標題文本
          font: {
            size: 16, // 字體大小
            weight: "bold", // 字體粗細
          },
        },
      },
      y: {
        ticks: {
          autoSkip: false, // 禁用自動跳過標籤
        },
      },
    },
    plugins: {
      legend: {
        display: false, // 隱藏圖例
      },
      tooltip: {
        callbacks: {
          label: (context) => `影響度: ${context.raw.toFixed(3)}`,
        },
      },
    },
    elements: {
      bar: {
        borderWidth: 1,
      },
    },
  };

  return <Bar data={data} options={options} />;
};

function App() {
  const [result, setResult] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [waiting, setWaiting] = useState(false);
  const [askMode, setMode] = useState("full"); // full or simple
  const [inputValue, setInputValue] = useState(
    "张某，男，27岁。患者因昨晚饮酒发热，喝凉水数杯，早晨腹痛腹泻，大便如水色黄，腹中辘辘有声，恶心欲吐，胸中满闷不舒，口干欲冷饮，舌质红、苔白腻，脉沉细数。给出中医诊断和处方建议。"
  );
  // 于某，男，62岁。患冠心病两年，服西药治疗，一日三次，从未有断，然胸憋心悸，一直不止。近月余，每至夜则咳嗽哮喘，痰涎清稀如水，倚息不能平卧，胸憋心悸尤甚。白昼则症状减轻。询知腰脊酸困，背畏风寒，时眩晕，手足心微热，口渴欲饮，但不多饮，亦不思冷，纳便尚可，舌尖略红，苔白腻，脉沉缓。给出中医诊断和处方建议。

  const [hoveredWord, setHoveredWord] = useState(null); // 保存懸浮的詞語
  const [clickedWord, setClickedWord] = useState(null); // 保存點擊的詞語

  let controller; // 用於控制請求

  const simpleAsk = async () => {
    try {
      setMode("simple");
      setResult([]);
      setWaiting(true);
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
      console.log(JSON.parse(result));
      setResult([JSON.parse(result)]);
    } catch (error) {
      console.error("請求失敗:", error.message);
    } finally {
      setWaiting(false);
    }
  };

  const fetchStream = async () => {
    // 如果有舊的請求，先取消它
    if (controller) {
      controller.abort();
    }
    // 創建新的 AbortController 實例
    controller = new AbortController();

    try {
      setResult([]);
      setMode("full");
      setWaiting(true);
      // 修改此處ip為server ip
      const response = await fetch("http://100.96.0.5:8000/fullQuery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: inputValue }),
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
          if (line.trim()) {
            // 確保行不為空
            try {
              const data = JSON.parse(line);
              console.log("Parsed data:", data);
              setResult((prevItems) => [...prevItems, data]);
              if ("word" in data) {
                setChartData((prevItems) => [
                  ...prevItems,
                  { word: data.word, weight: data.weight },
                ]);
              }
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
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("Fetch aborted");
      } else {
        console.error("Fetch error:", err);
      }
    } finally {
      controller = null; // 請求完成或中止後清空 controller
      setWaiting(false);
    }
  };

  const handleMouseEnter = (word) => {
    setHoveredWord(word); // 設置懸浮的詞語
  };

  const handleMouseLeave = () => {
    setHoveredWord(null); // 清除懸浮狀態
  };

  const handleClick = (word) => {
    setClickedWord(word); // 設置點擊的詞語
    console.log(`你點擊了: ${word}`);
    // 在這裡可以執行其他操作，例如調用 API 或更新狀態
  };

  const findWeight = (word) => {
    return result.findIndex((item) => {
      if (item.word && item.word === word) {
        return true;
      }
      return false;
    });
  };

  const sortChartData = (data) => {
    let arr = data;
    // 降序排序
    arr.sort((a, b) => b.weight - a.weight);
    return arr;
  };

  let clickWordIdx = findWeight(clickedWord);
  let hoverWordIdx = findWeight(hoveredWord);
  let focusWord = hoveredWord ? hoveredWord : clickedWord;
  let focusIdx = hoveredWord ? hoverWordIdx : clickWordIdx;

  let chartWordData = sortChartData(chartData).map((item) => item.word);
  let chartWeightData = sortChartData(chartData).map((item) => item.weight);

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100">
      <h1 className="text-2xl font-bold mb-4 mt-8">
        中醫藥大語言模型可解釋分析系統
      </h1>

      <div className="w-full max-w-[50rem]">
        <h2 className="text-xl text-blue-500">請在此輸入您的問題：</h2>
        {waiting ? (
          <div className="mb-4 p-2 border border-gray-300 rounded bg-white">
            {inputValue}
          </div>
        ) : (
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="mb-4 p-2 border border-gray-300 rounded resize w-full
            transition-all duration-300 hover:shadow-xl"
            placeholder="Enter your question"
            rows="5"
            cols="50"
          />
        )}

        {waiting && askMode === "full" && (
          <h2 className="text-xl text-blue-500">
            應用LIME算法計算中...請稍後，預計1min 30s
          </h2>
        )}
        {waiting && askMode === "simple" && (
          <h2 className="text-xl text-blue-500">拼命為您診斷中...</h2>
        )}

        {/* LIME分析結果 */}
        {askMode == "full" && (
          <h2 className="text-xl text-blue-500">LIME分析結果：</h2>
        )}

        {/* 渲染影響度圖表 */}
        {chartData.length > 0 && (
          <div className="mb-4 p-2 rounded bg-white">
            <ImpactChart words={chartWordData} weights={chartWeightData} />
          </div>
        )}

        <div className="flex flex-row col-span-2">
          {result.length > 0 && askMode == "full" && (
            <div className="flex-1">
              <div className="mb-4 p-4 border border-gray-300 rounded bg-white transition-all duration-300 hover:shadow-xl">
                {result[0].words.map((word, index) => {
                  let wordIdx = findWeight(word); // 獲取詞語的索引
                  return (
                    <span
                      key={index}
                      onMouseEnter={() => handleMouseEnter(word)}
                      onMouseLeave={handleMouseLeave}
                      onClick={() => handleClick(word)}
                      className={`
                      cursor-pointer inline-block
                      mr-2 mb-2 p-1 rounded-md
                      ${clickedWord === word ? "text-2xl" : "text-base"}
                      ${clickedWord === word ? "text-blue-500" : "text-black"}
                      ${clickedWord === word ? "font-bold" : "font-normal"}
                      ${
                        clickedWord === word
                          ? "bg-gray-200"
                          : wordIdx != -1
                          ? result[wordIdx].weight > 0
                            ? "bg-lime-200"
                            : "bg-pink-200"
                          : "null"
                      }
                      hover:text-xl hover:bg-gray-200 hover:text-blue-500 hover:font-bold hover:shadow-xl
                      transition-all duration-150
                    `}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* 詞語解釋 */}
          {result.length > 0 && (
            <div
              className="flex-1 p-4 border border-gray-300 rounded bg-white 
              transition-all duration-300 hover:shadow-xl ease-in-out"
            >
              {focusWord && focusIdx != -1
                ? result[focusIdx].word +
                  " 對問診回答的影響度：" +
                  result[focusIdx].weight +
                  "。" +
                  result[focusIdx].response
                : "請等待或點擊已分析完成的詞語查看解釋。"}
            </div>
          )}
        </div>

        {/* 模型回答 */}
        {result.length > 0 && (
          <>
            <h2 className="text-xl text-blue-500 ">中醫藥模型回答：</h2>
            <div
              className="mb-4 p-2 border border-gray-300 rounded bg-white
              transition-all duration-300 hover:shadow-xl
              "
            >
              {askMode === "simple" ? result[0] : result[0].o_response}
            </div>
          </>
        )}

        <button
          onClick={() => simpleAsk()}
          disabled={waiting}
          className={`
            transition-all duration-300 hover:shadow-xl
            p-2 text-white rounded w-full ${
              waiting ? "bg-gray-500" : "bg-blue-500"
            }`}
        >
          簡單提問
        </button>

        <button
          onClick={() => fetchStream()}
          disabled={waiting}
          className={`
            transition-all duration-300 hover:shadow-xl
            p-2 text-white rounded w-full mt-2 ${
              waiting ? "bg-gray-500" : "bg-blue-500"
            }`}
        >
          完整提問&分析
        </button>
      </div>
    </div>
  );
}

export default App;
