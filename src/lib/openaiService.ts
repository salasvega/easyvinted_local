import OpenAI from "openai";

let openai: OpenAI | null = null;

const getOpenAI = () => {
  if (!openai) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_OPENAI_API_KEY is not configured");
    }
    openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true
    });
  }
  return openai;
};

export interface ProductData {
  title: string;
  description: string;
  features: string[];
  category?: string;
  priceEstimate?: string;
  marketing?: {
    instagramCaption: string;
    hashtags: string[];
    salesEmail: string;
    seoKeywords: string[];
  };
}

export const analyzeProductImage = async (base64Image: string, mimeType: string): Promise<ProductData[]> => {
  const prompt = `
    You are an expert e-commerce copywriter and social media strategist.
    Analyze this product image.

    Identify ALL distinct fashion or accessory products visible in the image (e.g., if there is a Shirt and a Hat, create separate entries for each).
    If there is only one product, return a single entry.

    For EACH detected product, generate a high-converting listing kit:
    1. Product Listing: Catchy title, persuasive description, 5 key features, category, and price estimate (USD).
    2. Marketing Assets:
       - An engaging Instagram caption with emojis.
       - A list of 10 relevant, high-traffic hashtags.
       - A short, punchy sales email draft.
       - 5 SEO keywords.

    Return the response as a JSON object with this exact structure:
    {
      "products": [
        {
          "title": "Product Title",
          "description": "Detailed description",
          "features": ["feature1", "feature2", "feature3", "feature4", "feature5"],
          "category": "Category",
          "priceEstimate": "$XX.XX",
          "marketing": {
            "instagramCaption": "Caption with emojis",
            "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10"],
            "salesEmail": "Email draft",
            "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
          }
        }
      ]
    }
  `;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return parsed.products || [];
    }
    throw new Error("No response from model");
  } catch (error) {
    console.error("Analysis failed:", error);
    throw error;
  }
};

export const editProductImage = async (
  base64Image: string,
  mimeType: string,
  instruction: string
): Promise<string> => {
  throw new Error("L'édition d'images n'est pas encore supportée. Les APIs IA actuelles (OpenAI, Gemini) ont des limitations pour l'édition directe d'images. Utilisez des outils externes comme remove.bg, Canva ou Photopea pour éditer vos photos.");
};
