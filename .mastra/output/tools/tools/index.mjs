import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const weatherTool = createTool({
  id: "get-weather",
  description: "Get current weather for a location",
  inputSchema: z.object({
    location: z.string().describe("City name")
  }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.string(),
    location: z.string()
  }),
  execute: async ({ context }) => {
    return await getWeather(context.location);
  }
});
const getWeather = async (location) => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingResponse = await fetch(geocodingUrl);
  const geocodingData = await geocodingResponse.json();
  if (!geocodingData.results?.[0]) {
    throw new Error(`Location '${location}' not found`);
  }
  const { latitude, longitude, name } = geocodingData.results[0];
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;
  const response = await fetch(weatherUrl);
  const data = await response.json();
  return {
    temperature: data.current.temperature_2m,
    feelsLike: data.current.apparent_temperature,
    humidity: data.current.relative_humidity_2m,
    windSpeed: data.current.wind_speed_10m,
    windGust: data.current.wind_gusts_10m,
    conditions: getWeatherCondition(data.current.weather_code),
    location: name
  };
};
function getWeatherCondition(code) {
  const conditions = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Foggy",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
  };
  return conditions[code] || "Unknown";
}

async function fetchPMCOpenAccessMetadata(terms) {
  const baseUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/";
  if (!Array.isArray(terms) || terms.length === 0) {
    return [];
  }
  const query = terms.map((term) => `${term}[mesh]`).join(" AND ");
  const searchUrl = `${baseUrl}esearch.fcgi?db=pmc&term=${encodeURIComponent(query)}&retmax=2&retmode=json`;
  console.log("bs: ", query);
  console.log("bs: ", searchUrl);
  const searchResponse = await fetch(searchUrl);
  console.log("bs: ", searchResponse);
  if (!searchResponse.ok) {
    throw new Error(`ESearch failed: ${searchResponse.statusText}`);
  }
  const searchData = await searchResponse.json();
  console.log("bs: Search Data:", searchData);
  const pmcids = searchData.esearchresult.idlist || [];
  console.log("bs: PMCIDs:", pmcids);
  if (!pmcids.length) {
    console.log("No PMCIDs found for query:", query);
    return [];
  }
  const formattedPmcids = pmcids;
  const summaryUrl = `${baseUrl}esummary.fcgi?db=pmc&id=${formattedPmcids.join(",")}&retmode=json`;
  console.log("bs: Summary URL:", summaryUrl);
  const summaryResponse = await fetch(summaryUrl);
  if (!summaryResponse.ok) {
    throw new Error(`ESummary failed: ${summaryResponse.statusText}`);
  }
  const summaryData = await summaryResponse.json();
  console.log("bs: Summary Data:", summaryData);
  const articles = Object.values(summaryData.result || {}).filter((item) => item.uid).map((item) => {
    const pmcid = item.uid;
    return {
      pmid: item.articleids?.find((id) => id.idtype === "pmid")?.value || "Unknown",
      pmcid,
      title: item.title || "No title available",
      authors: item.authors?.map((a) => a.name) || ["Unknown"],
      journal: item.fulljournalname || item.source || "Unknown",
      pubDate: item.pubdate || item.epubdate || item.printpubdate || "Unknown",
      fullTextUrl: `https://www.ncbi.nlm.nih.gov/pmc/articles/${pmcid}/`
    };
  });
  return articles;
}
const getArticlesMetadataTool = createTool({
  id: "getOpenAccessArticlesMetadata",
  description: "Fetches metadata for the top 2 open access PMC articles based on an array of MeSH terms",
  inputSchema: z.object({
    query: z.array(z.any()).describe('An array of MeSH terms (e.g., ["asthma", "leukotrienes"])')
  }),
  outputSchema: z.object({
    articles: z.array(
      z.object({
        pmid: z.string(),
        pmcid: z.string(),
        title: z.string(),
        authors: z.array(z.string()),
        journal: z.string(),
        pubDate: z.string(),
        fullTextUrl: z.string()
      })
    ),
    query: z.array(z.string()),
    timestamp: z.string()
  }),
  execute: async ({ context }) => {
    const articles = await fetchPMCOpenAccessMetadata(context.query);
    console.log("Final Articles Array:", articles);
    return {
      articles,
      query: context.query,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
});

export { getArticlesMetadataTool, weatherTool };
