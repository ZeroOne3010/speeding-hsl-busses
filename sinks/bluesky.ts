import { BskyAgent } from "@atproto/api";
import { OutputSink } from "./types";

type BlueskyOptions = {
  username: string;
  password: string;
};

export const initializeBlueskySink = async ({ username, password }: BlueskyOptions): Promise<OutputSink> => {
  const bskyAgent = new BskyAgent({ service: "https://bsky.social" });
  await bskyAgent.login({ identifier: username, password });

  return {
    name: "bluesky",
    handle: async ({ message, chartBuffer, vehicleData }) => {
      const upload = await bskyAgent.uploadBlob(chartBuffer, { encoding: "image/png" });
      const altText = `Bussin ${vehicleData.line} (${vehicleData.operatorName} auto ${vehicleData.vehicleNumber}) nopeuskäyrä. ${vehicleData.observations.length} mittauspistettä.`;
      const post = await bskyAgent.post({
        text: message,
        embed: {
          $type: "app.bsky.embed.images",
          images: [{ image: upload.data.blob, alt: altText }]
        }
      });
      const maxObservedSpeed = vehicleData.observations.reduce(
        (max, observation) => (observation.speed > max ? observation.speed : max),
        0
      );

      const BLUESKY_LIKE_SPEED_THRESHOLD: number = 50;
      if (maxObservedSpeed >= BLUESKY_LIKE_SPEED_THRESHOLD) {
        try {
          await bskyAgent.like(post.uri, post.cid);
        } catch (error) {
          console.error(`Failed to like post ${post.uri}:`, error);
        }
      }
    },
    handleChartFailure: async ({ message }) => {
      await bskyAgent.post({ text: message + " (Nopeuskäyrän muodostus epäonnistui. 🪲)" });
    }
  };
};
