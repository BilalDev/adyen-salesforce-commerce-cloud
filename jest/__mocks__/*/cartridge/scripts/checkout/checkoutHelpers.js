export const placeOrder = jest.fn((order) => order);
export const sendConfirmationEmail = jest.fn();

export default {
  placeOrder,
  sendConfirmationEmail,
};
