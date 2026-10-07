const validateRegisterData = (data) => {
  const { name, email, password, phone, role } = data;

  const errors = {};

  if (!name || name.trim() === "") {
    errors.name = "Name is required";
  }

  if (!email || email.trim() === "") {
    errors.email = "Email is required";
  } else {
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;

    if (!emailRegex.test(email)) {
      errors.email = "Please enter a valid email";
    }
  }

  if (!password) {
    errors.password = "Password is required";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters";
  }

  if (!phone || phone.trim() === "") {
    errors.phone = "Phone number is required";
  }

  if (!role) {
    errors.role = "Role is required";
  } else if (!["parent", "daycare", "admin"].includes(role)) {
    errors.role = "Invalid role";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

module.exports = validateRegisterData;