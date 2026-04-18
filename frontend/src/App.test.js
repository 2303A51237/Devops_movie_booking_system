import { render, screen } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  global.fetch = jest.fn((url, options) => {
    if (options?.method === "POST") {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            booking: {
              id: "booking-1",
              bookingCode: "CR-ABC123",
              movieTitle: "Midnight Signal",
              seats: ["A1"],
              totalAmount: 220,
              showDate: "Today",
              showTime: "10:30 AM",
              screen: "Screen 1",
              createdAt: "2026-04-18T10:00:00.000Z"
            }
          })
      });
    }

    if (String(url).includes("/api/bookings")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    }

    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            id: "movie-1",
            title: "Midnight Signal",
            genre: ["Sci-Fi"],
            duration: "2h 08m",
            language: "English",
            rating: "U/A 13+",
            synopsis: "Synthetic test synopsis",
            posterAccent: "linear-gradient(135deg, #f97316, #7c3aed)",
            experience: "4K Laser + Dolby Atmos",
            showtimes: [
              {
                id: "show-1",
                screen: "Screen 1",
                startTime: "10:30 AM",
                dateLabel: "Today",
                price: 220,
                seatsLeft: 20,
                availableSeats: ["A1", "A2"],
                bookedSeats: []
              }
            ]
          }
        ])
    });
  });
});

afterEach(() => {
  jest.resetAllMocks();
});

test("renders movie booking content", async () => {
  render(<App />);
  expect(
    await screen.findByText(/book the next big-screen moment/i)
  ).toBeInTheDocument();
  expect(screen.getByText(/choose a movie/i)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /recent bookings/i })).toBeInTheDocument();
});
