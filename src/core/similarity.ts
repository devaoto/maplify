import { findBestMatch } from "string-similarity";

// Stole from MAL SYNC hehehe <:)
function sanitizeTitle(title: string | undefined): string | undefined {
  if (!title) {
    console.error("Received undefined or null title:", title);
    return undefined;
  }

  let resTitle = title.toLowerCase();

  resTitle = resTitle.replace(
    / *(\(dub\)|\(sub\)|\(uncensored\)|\(uncut\)|\(subbed\)|\(dubbed\))/i,
    ""
  );
  resTitle = resTitle.replace(/ *\([^)]+audio\)/i, "");
  resTitle = resTitle.replace(/ BD( |$)/i, "");
  resTitle = resTitle.trim();
  resTitle = resTitle.substring(0, 99); // truncate

  return resTitle;
}

type FrequencyMap = { [key: string]: number };
type IndexMap = { [key: string]: number };

export type Title =
  | {
      romaji?: string;
      english?: string;
      native?: string;
    }
  | string;

export type Input<T> = {
  title: string;
} & T;

// By @illusionztba
const FindBestMatchByTitles = <T>(
  title: Title | undefined,
  results: Input<T>[]
) => {
  if (!title) {
    console.warn("Received undefined or null title, returning early.");
    return {
      mostCommonMatch: null,
      mostCommonMatchIndex: -1,
      similarityScore: 0,
    };
  }

  const resultTitles = results
    .map((r) => r.title)
    .filter((t) => t !== undefined)
    .map((t) => sanitizeTitle(t));

  const matches: { target: string; score: number }[] = [];

  if (typeof title === "string") {
    const bestMatch = findBestMatch(
      sanitizeTitle(title)!,
      resultTitles as string[]
    );
    matches.push({
      target: bestMatch.bestMatch.target,
      score: bestMatch.bestMatch.rating,
    });
  } else {
    const bestMatch_english =
      title.english &&
      findBestMatch(sanitizeTitle(title.english)!, resultTitles as string[]);
    const bestMatch_romaji =
      title.romaji &&
      findBestMatch(sanitizeTitle(title.romaji)!, resultTitles as string[]);
    const bestMatch_native =
      title.native &&
      findBestMatch(sanitizeTitle(title.native)!, resultTitles as string[]);

    if (bestMatch_english)
      matches.push({
        target: bestMatch_english.bestMatch.target,
        score: bestMatch_english.bestMatch.rating,
      });
    if (bestMatch_romaji)
      matches.push({
        target: bestMatch_romaji.bestMatch.target,
        score: bestMatch_romaji.bestMatch.rating,
      });
    if (bestMatch_native)
      matches.push({
        target: bestMatch_native.bestMatch.target,
        score: bestMatch_native.bestMatch.rating,
      });
  }

  const frequencyMap: FrequencyMap = {};
  const scoreMap: { [key: string]: number } = {};
  const indexMap: IndexMap = {};

  matches.forEach((match) => {
    frequencyMap[match.target] = (frequencyMap[match.target] || 0) + 1;
    scoreMap[match.target] = match.score;
    if (indexMap[match.target] === undefined) {
      indexMap[match.target] = resultTitles.indexOf(match.target);
    }
  });

  let mostCommonMatch: string | null = null;
  let maxFrequency = 0;
  let similarityScore = 0;

  for (const [match, frequency] of Object.entries(frequencyMap)) {
    if (frequency > maxFrequency) {
      mostCommonMatch = match;
      maxFrequency = frequency;
      similarityScore = scoreMap[match];
    }
  }

  const mostCommonMatchIndex = mostCommonMatch ? indexMap[mostCommonMatch] : -1;

  return { mostCommonMatch, mostCommonMatchIndex, similarityScore };
};

export { FindBestMatchByTitles, sanitizeTitle };
