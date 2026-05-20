export const setStorage = (name, value) => {
  localStorage.setItem(name, value);
};

export const getStorage = (name) => {
  return localStorage.getItem(name);
};

export const deleteStorage = (name) => {
  localStorage.removeItem(name);
};
