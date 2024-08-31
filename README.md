# Maplify

Maplify is a powerful module that allows for fetching, extracting, and mapping titles across multiple websites. It supports REST APIs, GraphQL, and HTML scraping, making it an ideal tool for web scraping and data mapping tasks, especially for anime-related content.

## Installation

Install Maplify using your preferred package manager:

```sh
bun add maplify
# or
yarn add maplify
# or
npm install maplify
```

## Usage

Here is a basic example of how to use Maplify:

```js
const { Maplify } = require("maplify"); // Use import { Maplify } from "maplify" if you're using TypeScript or ES modules.

const maplify = new Maplify(
  {
    url: "https://graphql.anilist.co",
    query: `query ($search: String) {
      Page {
        media(search: $search) {
          siteUrl
          title {
            english
            native
            romaji
          }
          description
        }
      }
    }`,
    variables: JSON.stringify({
      search: "Alya sometimes hides her feelings in russian",
    }),
  },
  {
    url: "https://anitaku.pe/search.html?keyword=",
    selectors: {
      mainSelector: ".items li",
      title: "p.name",
      poster: ".img img@src", // @src is the attribute
    },
  },
  {
    url: "https://hianime.to/search?keyword=",
    selectors: {
      mainSelector: ".film_list-wrap .flw-item",
      title: "h3.film-name",
      poster: ".film-poster img@data-src",
    },
  },
  {
    url: "https://kaido.to/search?keyword=",
    selectors: {
      mainSelector: ".film_list-wrap .flw-item",
      title: "h3.film-name",
      poster: ".film-poster img@data-src",
    },
  }
);

const scrapedData = await maplify.search(
  "Alya Sometimes Hides Her Feelings In Russian"
); // Provide an empty string if all your websites are GraphQL-based.

console.log(scrapedData); // Outputs the extracted and mapped data.
```

## API

### `Maplify`

The main class responsible for mapping data across multiple websites.

#### Constructor

```typescript
constructor(...websites: Website<any>[])
```

- `websites`: An array of website configurations. At least two websites are required.

Throws an error if fewer than two websites are provided.

#### `search(query: string): Promise<{ extractedData: any[][]; mappedTitles: any[] }>`

Searches for titles across all configured websites using the provided query.

- `query`: The search query. For GraphQL websites, provide an empty string.

Returns a promise that resolves to an object containing the extracted data and mapped titles.

### `Website<T extends Record<string, any>>`

The interface for defining website configurations.

- `url`: The base URL of the website.
- `isRestAPI?`: Indicates whether the website is a REST API.
- `query?`: The GraphQL query string.
- `variables?`: The GraphQL variables string.
- `selectors?`: Object defining CSS selectors for HTML scraping.
