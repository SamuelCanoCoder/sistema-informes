const URL = "https://script.google.com/macros/s/AKfycbzgHptySjPd5qu2vN99bl-4uuXqbyCgsDFXQCIghN1TJLgdgaco2gXneUOLKDceJHg2cA/exec";

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