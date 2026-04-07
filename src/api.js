const URL = "https://script.google.com/macros/s/AKfycbzAMYiXgHteQIJyiBD3d8kxppBJZTw75GztfMrRrFaSPKB-TmIWNXZAo-Y1g1C8unBvYA/exec";

export const getData = async () => {
  const response = await fetch(URL);
  return await response.json();
};

export const postInforme = async (payload) => {
  await fetch(URL, {
    method: "POST",
    body: JSON.stringify(payload),
  });
};