import fetch from "node-fetch";

const API_KEY = "sk-ROKOkInYYHET5PUuVL40iRRAvMtHTOnoaawz7sz9xH4m4xW9";
const BASE_URL = "https://new-api.zonde306.site/v1";

async function testGenerateImage() {
  console.log("【1】generate_image 测试...");
  try {
    const res = await fetch(`${BASE_URL}/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-imagine-1.0",
        prompt: "A beautiful sunset over the ocean",
        n: 1,
        size: "1024x1024",
      }),
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log("✅ 生图成功:", data.data[0].url);
      return data.data[0].url;
    } else {
      console.error("❌ 失败:", res.status, await res.text());
    }
  } catch (err) {
    console.error("❌ 错误:", err.message);
  }
}

async function testEditImage() {
  console.log("【2】edit_image 测试...");
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-imagine-1.0-edit",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Change the sky to bright blue" },
              { type: "image_url", image_url: { url: "https://grokproxy.zonde306.site/v1/files/image/21cbcba3-01d4-4bc9-bd7c-9d6b9db024ec.jpg" } }
            ]
          }
        ],
        stream: false,
      }),
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log("✅ 编辑成功:", data.choices[0].message.content);
    } else {
      console.error("❌ 失败:", res.status, await res.text());
    }
  } catch (err) {
    console.error("❌ 错误:", err.message);
  }
}

async function testGenerateVideo() {
  console.log("【3】generate_video 测试...");
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "grok-imagine-1.0-video",
        messages: [{ role: "user", content: "A cat walking in the grass" }],
        stream: false,
        video_config: {
          aspect_ratio: "16:9",
          video_length: 6,
          resolution_name: "720p",
          preset: "normal",
        },
      }),
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log("✅ 视频生成成功:", data.choices[0].message.content);
    } else {
      console.error("❌ 失败:", res.status, await res.text());
    }
  } catch (err) {
    console.error("❌ 错误:", err.message);
  }
}

async function runTests() {
  await testGenerateImage();
  await testEditImage();
  await testGenerateVideo();
}

runTests();
