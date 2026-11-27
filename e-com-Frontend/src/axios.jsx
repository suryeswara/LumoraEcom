import axios from "axios";
import { attachAuth } from "./auth/attachAuth";

const API = axios.create({
  baseURL: `${import.meta.env.VITE_BASE_URL || "http://localhost:8080"}/api`,
});
delete API.defaults.headers.common["Authorization"];
attachAuth(API); // adds the JWT per request instead of a fixed header
export default API;
