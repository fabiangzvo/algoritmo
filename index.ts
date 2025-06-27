// Requisitos previos:
// - Tener un PAGE_ACCESS_TOKEN válido
// - Tener el PAGE_ID
// - Instalar axios y form-data: npm install axios form-data

import axios from "axios";
import * as fs from "fs";
import FormData from "form-data";

const PAGE_ID = "106536031943179";
const PAGE_ACCESS_TOKEN =
  "EAATnZBMr1ZBfYBOx9KF8RZCuDRBZB4CIuWtu5dXy9yZAcnZBayTm4bxQhprbmftrSm853zHnJQwjxbPHVyvPaPZA4iZAvIo18HEJUn0glL1FVLBdkZABEz26vCCkU20FCSPOGGTBLUFoB7JoFlyL7w9vKTp1SR6JCTvf232X9SLiINGfMHOn1BJ3gFx4tEJ9ynJ8lD33qPjauhvi0STy4w6Mj69bUhvoRdZCYj2ZBBp4ASaOgZDZD";
const VIDEO_PATH = "./video.mp4";

async function subirReelFacebook() {
  const videoStats = fs.statSync(VIDEO_PATH);

  // 1. Start upload session
  const startRes = await axios
    .post(
      `https://graph.facebook.com/v23.0/${PAGE_ID}/video_reels`,
      new URLSearchParams({
        upload_phase: "start",
        file_size: videoStats.size.toString(),
        access_token: PAGE_ACCESS_TOKEN,
      })
    )
    .catch((e) => {
      console.log(e);
      return { data: [] };
    });

  const { video_id, upload_url } = startRes.data;
  console.log("Sesión iniciada:", JSON.stringify(startRes.data));

  const stats = fs.statSync(VIDEO_PATH);

  console.log(`Tamaño del video: ${stats.size} bytes`);
  const i = fs.createReadStream(VIDEO_PATH);

  const r = await axios
    .post(upload_url, fs.createReadStream(VIDEO_PATH), {
      headers: {
        Authorization: `OAuth ${PAGE_ACCESS_TOKEN}`,
        offset: 0,
        file_size: stats.size,
        "Content-Type": "application/octet-stream",
        "Content-Length": stats.size,
      },
    })
    .catch((e) => {
      console.log(JSON.stringify(e));
      return { data: {} };
    });
  console.log(JSON.stringify(r.data));
  console.log("Transferencia completa");

  // 3. Finalize upload
  const publishResponse = await axios
    .post(
      `https://graph.facebook.com/v23.0/${PAGE_ID}/video_reels`,
      new URLSearchParams({
        upload_phase: "finish",
        video_state: "PUBLISHED",
        video_id,
        description: "Testing this app",
        access_token: PAGE_ACCESS_TOKEN,
      })
    )
    .catch((e) => {
      console.log(JSON.stringify(e));
      return { data: {} };
    });

  console.log(JSON.stringify(publishResponse.data));
  console.log("Reel publicado con éxito. Video ID:", video_id);
}

subirReelFacebook().catch(console.error);
