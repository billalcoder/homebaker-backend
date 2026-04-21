import { GoogleGenAI } from "@google/genai";
import { ShopModel } from "../models/ShopModel.js";

const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

export async function aiResponse(userPrompt) {
  try {
    // 1. Fetch fresh data inside the function
    const shopData = await ShopModel.find().select(
      "shopName productCount shopDescription",
    );

    const formattedData = shopData
      .map(
        (shop, index) =>
          `${index + 1}. ${shop.shopName}: ${shop.shopDescription} (${shop.productCount} products)`,
      )
      .join("\n");

    const prompt = `
      Available Bakers:
      ${formattedData}

      Customer Request: ${userPrompt}
    `;
    // 2. Initialize model with System Instructions
    const model = await genAI.models.generateContent({
      model: "gemini-3-flash-preview", // Use the stable version name
      contents: `You are a helpful assistant for a bakery app. You ONLY suggest bakers from the provided list. If no baker matches the request, politely say you can't help with that. from here user prompt will be their ${prompt}`,
    });

    // 3. Structure the prompt clearly

    console.log(model.text);

    return model.text;
  } catch (error) {
    console.error("AI Error:", error);
    return "I'm having trouble connecting to the bakery directory right now.";
  }
}
