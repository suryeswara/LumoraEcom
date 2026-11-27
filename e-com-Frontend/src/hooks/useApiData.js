import { useCallback, useEffect, useState } from "react";
import axios from "../axios";

// Loads one GET endpoint of our API and exposes loading, error and reload.
export default function useApiData(path) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");

  const load = useCallback(() => {
    setStatus("loading");
    return axios
      .get(path)
      .then(({ data: body }) => {
        setData(body);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [path]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, setData, status, reload: load };
}
