// Requisitos previos:
// - Tener un PAGE_ACCESS_TOKEN válido
// - Tener el PAGE_ID
// - Instalar axios y form-data: npm install axios form-data

import axios from "axios";
import * as fs from "fs";
//import * as AxiosLogger from "axios-logger";
import puppeteer from "puppeteer";

const instance = axios.create();
//instance.interceptors.request.use(AxiosLogger.requestLogger);

const PAGE_ID = "106536031943179";
const PAGE_ACCESS_TOKEN =
  "EAATnZBMr1ZBfYBOxR6pCZC6KDWzfh2JqWAHep8ZBPuPOi4chZBlcMrA8E3xTJ0dZBfO88q0HZA8QGUNHPN6cGon1tb4ffo1MQiPdCUBJS3NjBnPFggK5pAH2sY5wuZAXLx6QMIlQ29ooF5WMosL2VhVnA82XXDGU9vffZCZAnbLC1GMI8xGrU1hG41Dde7TjZCHiDpdfGCMjAkZBWstdHfybZB9t0I5HWjVXFIqhqvpUDw9Gb7foZD";

async function uploadReelFacebook({
  description,
  video,
}: {
  description: string;
  video: Buffer;
}) {
  // 1. Start upload session
  const startRes = await axios
    .post(
      `https://graph.facebook.com/v23.0/${PAGE_ID}/video_reels`,
      new URLSearchParams({
        upload_phase: "start",
        file_size: `${video.byteLength}`,
        access_token: PAGE_ACCESS_TOKEN,
      })
    )
    .catch((e) => {
      console.log(JSON.stringify(e));
      return { data: [] };
    });

  const { video_id, upload_url } = startRes.data;

  console.log(`Tamaño del video: ${video.byteLength} bytes`);

  const r = await axios
    .post(upload_url, video, {
      headers: {
        Authorization: `OAuth ${PAGE_ACCESS_TOKEN}`,
        offset: 0,
        file_size: video.byteLength,
        "Content-Type": "application/octet-stream",
        "Content-Length": video.byteLength,
      },
    })
    .catch((e) => {
      console.log("subiendo el video", video_id);
      return { data: {} };
    });

  console.log("Transferencia completa");

  // 3. Finalize upload
  const publishResponse = await axios
    .post(
      `https://graph.facebook.com/v23.0/${PAGE_ID}/video_reels`,
      new URLSearchParams({
        upload_phase: "finish",
        video_state: "PUBLISHED",
        video_id,
        description: description,
        access_token: PAGE_ACCESS_TOKEN,
      })
    )
    .catch((e) => {
      console.log("error publicando");
      return { data: {} };
    });

  console.log("Reel publicado con éxito. Video ID:", video_id);
}

async function main() {
  const browser = await puppeteer.launch({ headless: true });

  const page = await browser.newPage();

  // Escuchar respuestas
  page.on("response", async (response) => {
    const request = response.request();

    if (
      request.url().includes("https://www.tiktok.com/api/explore/item_list")
    ) {
      try {
        const searchParams = new URLSearchParams(request.url().split("?")[1]);
        const category = Number(searchParams.get("categoryType"));

        if (category !== 104) return;

        const body = await response.json();

        const { itemList = [] } = body;

        const videoUrls = itemList.slice(0, 2).map((item: any) => ({
          videoUrl: item.video.PlayAddrStruct.UrlList[0],
          description: item.desc,
        }));
        console.log("------------------------");
        console.log(videoUrls);
        console.log("------------------------");
        const videos = await Promise.all<{
          video: Buffer;
          description: string;
        }>(
          videoUrls.map(async (item: (typeof videoUrls)[0]) => {
            const response = await axios.get(item.videoUrl, {
              responseType: "arraybuffer",
            });
            const buffer = Buffer.from(response.data);
            fs.writeFileSync("video.mp4", buffer);

            return { video: buffer, description: item.description };
          })
        );

        await Promise.all(
          videos.map(async (info) => {
            await uploadReelFacebook(info);
          })
        );
      } catch (err) {
        console.error("❌ Error leyendo la respuesta:", err);
      }
    }
  });

  // Ir a una página donde ocurra el request deseado
  const r = await page.goto(
    "https://www.tiktok.com/api/explore/item_list/?WebIdLastTime=1750990086&aid=1988&app_language=es&app_name=tiktok_web&browser_language=es-ES&browser_name=Mozilla&browser_online=true&browser_platform=Linux%20x86_64&browser_version=5.0%20%28X11%3B%20Linux%20x86_64%29%20AppleWebKit%2F537.36%20%28KHTML%2C%20like%20Gecko%29%20Chrome%2F134.0.0.0%20Safari%2F537.36&categoryType=104&channel=tiktok_web&clientABVersions=70508271%2C73485600%2C73720541%2C73810951%2C73814854%2C73848867%2C73858987%2C73926796%2C73950561%2C73953835%2C73966905%2C73978323%2C74022234%2C74025630%2C74112894%2C74129613%2C70405643%2C71057832%2C71200802%2C73004916%2C73171280%2C73208420%2C73574728&cookie_enabled=true&count=8&data_collection_enabled=true&device_id=7520445122729264696&device_platform=web_pc&enable_cache=true&focus_state=true&history_len=6&is_fullscreen=false&is_page_visible=true&language=es&odinId=7520445011948192774&os=linux&priority_region=&referer=https%3A%2F%2Fwww.tiktok.com%2Flive&region=CO&root_referer=https%3A%2F%2Fwww.tiktok.com%2F%40bruno.deav%2Fphoto%2F7519671696014576901&screen_height=864&screen_width=1536&tz_name=America%2FBogota&user_is_login=false&verifyFp=verify_mce6arpz_hEUFffWG_hCTo_4fZD_862j_r4duVY4fjkKf&webcast_language=es"
  );

  await page.waitForSelector("#category-list-container button:nth-child(3)");

  // Esperar a que exista el botón con texto "Comedy"
  // const [button] = await page.$$(
  //   "#category-list-container button:nth-child(3)"
  // );

  // if (button) await button.click();
  // Esperar un poco para ver el resultado
  //await browser.close();
}

main().catch(console.error);
