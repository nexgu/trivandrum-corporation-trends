# Trivandrum Corporation Election Trends 🗳️

A comprehensive, interactive web dashboard analyzing and visualizing the election results for the Trivandrum Corporation across the **2015**, **2020**, and **2025** local body elections.

## ⚠️ Data Accuracy Caution

> **Please Note:** The underlying data powering this dashboard has **not been manually cross-checked for 100% accuracy**. There may be instances of data mismatch, missing historical candidates, or spelling discrepancies between wards across different election years. Please use this tool for general trend analysis and verify specific data points with official sources.

### Data Sources
* **Official Source:** [State Election Commission, Kerala (Trend)](https://trend.sec.kerala.gov.in/)
* **Additional Aggregation:** [OpenDataKerala - LSGD 2025 Results Data](https://github.com/opendatakerala/LSGD2025-Results-Data)

---

## 💻 Technical Details

This project is engineered for extremely high performance and low hosting costs, built as a statically generated **Single Page Application (SPA)**. 

### Technology Stack
* **Framework:** [Astro](https://astro.build/) (v5)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Logic & Routing:** Vanilla JavaScript (No heavy framework runtime; utilizing History API for routing)
* **Data Visualization:** [Chart.js](https://www.chartjs.org/) + DataLabels Plugin
* **Data Format:** Static aggregated JSON datasets generated from raw CSVs.

### Architecture Highlights
* **Static Site Generation (SSG):** The entire application is built into static HTML, CSS, and JS files, meaning it can be hosted for free on a simple CDN like GitHub Pages without requiring a Node.js server.
* **Component Design:** Built adhering to a minimalist design system inspired by Shadcn/UI, but using pure utility classes instead of React dependencies.
* **Client-side Search:** Dropdown and filtering are handled natively in the browser via JavaScript utilizing a unified JSON payload, eliminating network roundtrips (`latency = 0`).

---

## 🚀 How to Run Locally

To get this project up and running on your local machine, follow these steps:

### Prerequisites
* Node.js (v18 or higher recommended)
* npm (Node Package Manager)

### Installation & Setup

1. **Clone the repository** (or navigate to the project directory):
   ```bash
   cd trivandrum_corp_trend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```

4. **View the application:**
   Open your browser and navigate to the local URL provided in the terminal (usually `http://localhost:4321`).

### Deployment Variables
If you are modifying this for your own GitHub pages deployment, you may need to update the `site` and `base` config in `astro.config.mjs` to match your GitHub username and repository name.

## 🧞 Astro Commands

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
