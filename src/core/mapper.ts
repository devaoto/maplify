import { load } from "cheerio";
import axios from "axios";
import { FindBestMatchByTitles } from "./similarity";

export interface Website<T extends Record<string, any>> {
  url: string;
  isRestAPI?: boolean;
  query?: string;
  variables?: string;
  selectors?: {
    mainSelector: string;
    title: string;
  } & T;
}

/**
 * Maplify is a utility class that allows for fetching, extracting, and mapping titles across
 * multiple websites. It supports REST APIs, GraphQL, and HTML scraping.
 */
export class Maplify<T extends Record<string, any>> {
  private websites: Website<T>[];

  /**
   * @param {...Website<T>[]} websites - The websites to be mapped. At least two websites are required.
   * @throws {Error} Throws an error if less than two websites are provided.
   */
  constructor(...websites: Website<T>[]) {
    if (websites.length < 2) {
      throw new Error("At least two websites are required to map");
    }
    this.websites = websites;
  }

  /**
   * Searches for titles across all configured websites using the provided query.
   *
   * @param {string} query - The search query. For GraphQL websites, an empty string should be provided.
   * @returns {Promise<{ extractedData: T[][], mappedTitles: any[] }>}
   *          Returns an object containing the extracted data and the mapped titles.
   */
  async search(query: string): Promise<{
    extractedData: T[][];
    mappedTitles: Array<{ data: { [key: string]: T }; score: number }>;
  }> {
    const dataPromises = this.websites.map((website) =>
      this.fetchData(website, query)
    );
    const results = await Promise.all(dataPromises);

    const extractedData = results.map((result, index) =>
      this.extractData(result, this.websites[index])
    );

    const mappedTitles = this.mapTitles(extractedData);

    return { extractedData, mappedTitles };
  }

  /**
   * Fetches data from a website. Handles both GraphQL and REST API requests.
   *
   * @param {Website<T>} website - The website configuration.
   * @param {string} [query] - The search query. Used for REST API requests.
   * @returns {Promise<any>} Returns the raw data from the website.
   * @throws {Error} Throws an error if there's a problem with the GraphQL configuration or data fetching.
   */
  private async fetchData(website: Website<T>, query?: string): Promise<any> {
    const url =
      website.query || website.variables
        ? `${website.url}`
        : `${website.url}${encodeURIComponent(query!)}`;

    try {
      if (website.query && !website.variables)
        throw new Error("GraphQL needs variables.");

      if (website.variables && !website.query)
        throw new Error("GraphQL needs a query.");

      if (website.query && website.variables) {
        const { data } = await axios.post(url, {
          query: website.query,
          variables: website.variables,
        });
        return data;
      } else {
        const { data } = await axios.get(url);
        return data;
      }
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error);
      throw error;
    }
  }

  /**
   * Extracts data from the fetched response. Works with both REST API/GraphQL and HTML scraping.
   *
   * @param {any} data - The raw data fetched from the website.
   * @param {Website<T>} website - The website configuration.
   * @returns {T[]} Returns an array of extracted data objects.
   * @throws {Error} Throws an error if the data does not contain an array with title properties.
   */
  private extractData(data: any, website: Website<T>): T[] {
    if (website.isRestAPI || website.query) {
      const findArray = (obj: any): any[] | null => {
        if (Array.isArray(obj)) {
          return obj;
        }
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            const result = findArray(obj[key]);
            if (result) {
              return result;
            }
          }
        }
        return null;
      };

      const arrayData = findArray(data);

      if (!arrayData) {
        throw new Error(
          "REST API or GraphQL response should contain an array property"
        );
      }

      return arrayData.map((item: any) => {
        if (!item.title) {
          throw new Error(
            "Each item in the array should contain a title property of type string"
          );
        }
        return item;
      });
    } else {
      const $ = load(data);
      const results: T[] = [];
      const selectors = website.selectors ?? { mainSelector: "body" };
      const mainSelector = selectors.mainSelector;

      $(mainSelector).each((_, element) => {
        const result: Partial<T> = {};
        for (const [key, value] of Object.entries(selectors)) {
          if (key !== "mainSelector" && value) {
            let extractedValue: string;
            if (typeof value === "string") {
              const [selector, attribute] = value.split("@");
              if (attribute) {
                extractedValue =
                  $(element).find(selector).attr(attribute) ?? "";
              } else {
                extractedValue = $(element).find(selector).text().trim();
              }
            } else {
              extractedValue = $(element)
                .find(value as string)
                .text()
                .trim();
            }
            (result as any)[key] = extractedValue;
          }
        }
        results.push(result as T);
      });
      return results;
    }
  }

  /**
   * Maps titles between the extracted data from different websites.
   *
   * @param {T[][]} extractedData - The extracted data arrays from each website.
   * @returns {any[]} Returns an array of mapped titles.
   */
  private mapTitles(
    extractedData: T[][]
  ): Array<{ data: { [key: string]: T }; score: number }> {
    const mappedTitles: Array<{ data: { [key: string]: T }; score: number }> =
      [];

    const baseData = extractedData[0];

    baseData.forEach((baseItem) => {
      if (baseItem && baseItem.title) {
        const matches: { [key: string]: T } = { base: baseItem };
        let lowestScore = Infinity;

        for (let i = 1; i < extractedData.length; i++) {
          const otherData = extractedData[i];
          const bestMatch = FindBestMatchByTitles(
            baseItem.title,
            otherData as unknown as { title: string }[]
          );

          if (bestMatch.mostCommonMatchIndex !== -1) {
            matches[`website${i + 1}`] =
              otherData[bestMatch.mostCommonMatchIndex];
            lowestScore = Math.min(lowestScore, bestMatch.similarityScore);
          }
        }

        if (Object.keys(matches).length > 1) {
          mappedTitles.push({ data: matches, score: lowestScore });
        }
      } else {
        console.warn(
          "Skipping item with undefined or non-string title:",
          baseItem
        );
      }
    });

    return mappedTitles;
  }
}
