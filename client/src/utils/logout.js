const logout = () => {
  localStorage.removeItem("user");
  window.location.href = "/";
};

export default logout;
