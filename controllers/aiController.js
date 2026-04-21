import { aiResponse } from "../utils/gemine.js";

export const aiData = async (req, res, next) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(403).json({ error: "prompt is required" });
  }
  try {
    const response = await aiResponse(prompt);
    return res.status(200).json({ data: response });
  } catch (error) {
    next(error);
  }
};
