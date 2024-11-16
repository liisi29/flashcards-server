interface IPrice {
  startDate: string;
  endDate: string;
  price: number;
}
import path from "path";
const _app = require("express");
const _routes = _app.Router();

const prices: IPrice[] = require(path.resolve(
  __dirname,
  "../data/prices.json"
));

_routes.get(
  "/prices",
  (req: any, res: { json: (arg0: any) => void; status: any }) => {
    try {
      res.status(200).json(prices);
    } catch (err) {
      console.error("Error fetching prices:", err);
      res.status(500).json({ error: "Failed to fetch prices" });
    }
  }
);

module.exports = _routes;
