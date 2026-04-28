
/**
 * Checks if the Indian Stock Market (NSE/BSE) is currently open.
 * Hours: Monday-Friday, 9:15 AM to 3:30 PM IST.
 */
export const isMarketOpen = () => {
  const now = new Date();
  
  // Convert current time to IST
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
  
  const day = istTime.getDay(); // 0 (Sun) to 6 (Sat)
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const currentTimeInMinutes = hours * 60 + minutes;

  // Weekends
  if (day === 0 || day === 6) return false;

  // Market hours: 9:15 AM (555 mins) to 3:30 PM (930 mins)
  const openingTime = 9 * 60 + 15;
  const closingTime = 15 * 60 + 30;

  return currentTimeInMinutes >= openingTime && currentTimeInMinutes <= closingTime;
};

export const isTradingDay = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + istOffset);
  const day = istTime.getDay(); // 0 (Sun) to 6 (Sat)
  return day !== 0 && day !== 6;
};
