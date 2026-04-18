const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const mongoUri =
  process.env.MONGO_URI ||
  (process.env.NODE_ENV === "production"
    ? "mongodb://mongo:27017/movie_booking_app"
    : "mongodb://localhost:27017/movie_booking_app");

app.use(cors());
app.use(express.json());

const showtimeSchema = new mongoose.Schema(
  {
    screen: { type: String, required: true },
    startTime: { type: String, required: true },
    dateLabel: { type: String, required: true },
    price: { type: Number, required: true },
    availableSeats: { type: [String], default: [] },
    bookedSeats: { type: [String], default: [] }
  },
  { _id: true }
);

const movieSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    genre: { type: [String], default: [] },
    duration: { type: String, required: true },
    language: { type: String, required: true },
    rating: { type: String, required: true },
    synopsis: { type: String, required: true },
    posterAccent: { type: String, required: true },
    experience: { type: String, required: true },
    showtimes: { type: [showtimeSchema], default: [] }
  },
  { timestamps: true }
);

const bookingSchema = new mongoose.Schema(
  {
    movieId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Movie",
      required: true
    },
    movieTitle: { type: String, required: true },
    showtimeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    showDate: { type: String, required: true },
    showTime: { type: String, required: true },
    screen: { type: String, required: true },
    seats: { type: [String], required: true },
    totalAmount: { type: Number, required: true },
    customerName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: "" }
  },
  { timestamps: true }
);

const Movie = mongoose.model("Movie", movieSchema);
const Booking = mongoose.model("Booking", bookingSchema);
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildSeatLayout = (rows, seatsPerRow) => {
  const seats = [];

  for (let row = 0; row < rows.length; row += 1) {
    for (let seat = 1; seat <= seatsPerRow; seat += 1) {
      seats.push(`${rows[row]}${seat}`);
    }
  }

  return seats;
};

const seedMovies = [
  {
    title: "Midnight Signal",
    genre: ["Sci-Fi", "Thriller"],
    duration: "2h 08m",
    language: "English",
    rating: "U/A 13+",
    synopsis:
      "A data journalist intercepts a coded transmission that predicts disasters before they happen, forcing her into a race against time inside a neon-drenched megacity.",
    posterAccent: "linear-gradient(135deg, #f97316, #7c3aed)",
    experience: "4K Laser + Dolby Atmos",
    showtimes: [
      {
        screen: "Screen 1",
        startTime: "10:30 AM",
        dateLabel: "Today",
        price: 220,
        availableSeats: buildSeatLayout(["A", "B", "C", "D", "E"], 8),
        bookedSeats: ["A3", "A4", "C6"]
      },
      {
        screen: "Screen 3",
        startTime: "6:45 PM",
        dateLabel: "Today",
        price: 280,
        availableSeats: buildSeatLayout(["A", "B", "C", "D", "E"], 8),
        bookedSeats: ["B2", "B3", "D5", "D6"]
      }
    ]
  },
  {
    title: "Monsoon Hearts",
    genre: ["Romance", "Drama"],
    duration: "2h 21m",
    language: "Hindi",
    rating: "U",
    synopsis:
      "Two architects rebuilding a flood-hit coastal town fall in love while confronting the one project that could separate them forever.",
    posterAccent: "linear-gradient(135deg, #0f766e, #38bdf8)",
    experience: "Recliner Lounge",
    showtimes: [
      {
        screen: "Screen 2",
        startTime: "1:15 PM",
        dateLabel: "Today",
        price: 190,
        availableSeats: buildSeatLayout(["A", "B", "C", "D"], 8),
        bookedSeats: ["A1", "C4"]
      },
      {
        screen: "Screen 2",
        startTime: "8:30 PM",
        dateLabel: "Tomorrow",
        price: 240,
        availableSeats: buildSeatLayout(["A", "B", "C", "D"], 8),
        bookedSeats: ["B5", "B6", "C1"]
      }
    ]
  },
  {
    title: "Jungle Circuit",
    genre: ["Adventure", "Family"],
    duration: "1h 56m",
    language: "English",
    rating: "U",
    synopsis:
      "A robotics prodigy and her younger brother enter an ancient rainforest where abandoned machines have evolved into a hidden civilization.",
    posterAccent: "linear-gradient(135deg, #16a34a, #eab308)",
    experience: "3D Family Show",
    showtimes: [
      {
        screen: "Screen 4",
        startTime: "11:45 AM",
        dateLabel: "Tomorrow",
        price: 180,
        availableSeats: buildSeatLayout(["A", "B", "C", "D", "E"], 7),
        bookedSeats: ["A2", "E7"]
      },
      {
        screen: "Screen 4",
        startTime: "4:00 PM",
        dateLabel: "Tomorrow",
        price: 210,
        availableSeats: buildSeatLayout(["A", "B", "C", "D", "E"], 7),
        bookedSeats: ["C3", "C4", "C5"]
      }
    ]
  }
];

const serializeMovie = (movie) => ({
  id: movie._id,
  title: movie.title,
  genre: movie.genre,
  duration: movie.duration,
  language: movie.language,
  rating: movie.rating,
  synopsis: movie.synopsis,
  posterAccent: movie.posterAccent,
  experience: movie.experience,
  showtimes: movie.showtimes.map((showtime) => ({
    id: showtime._id,
    screen: showtime.screen,
    startTime: showtime.startTime,
    dateLabel: showtime.dateLabel,
    price: showtime.price,
    seatsLeft: showtime.availableSeats.length - showtime.bookedSeats.length,
    availableSeats: showtime.availableSeats,
    bookedSeats: showtime.bookedSeats
  }))
});

const connectDatabase = async () => {
  await mongoose.connect(mongoUri);
  const movieCount = await Movie.countDocuments();

  if (movieCount === 0) {
    await Movie.insertMany(seedMovies);
  }
};

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "movie-booking-api" });
});

app.get("/api/movies", async (_req, res, next) => {
  try {
    const movies = await Movie.find().sort({ createdAt: 1 });
    res.json(movies.map(serializeMovie));
  } catch (error) {
    next(error);
  }
});

app.get("/api/bookings", async (_req, res, next) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 }).limit(10);
    res.json(
      bookings.map((booking) => ({
        id: booking._id,
        movieTitle: booking.movieTitle,
        showDate: booking.showDate,
        showTime: booking.showTime,
        screen: booking.screen,
        seats: booking.seats,
        totalAmount: booking.totalAmount,
        customerName: booking.customerName,
        createdAt: booking.createdAt
      }))
    );
  } catch (error) {
    next(error);
  }
});

app.get("/api/stats", async (_req, res, next) => {
  try {
    const [movieCount, bookingCount] = await Promise.all([
      Movie.countDocuments(),
      Booking.countDocuments()
    ]);
    res.json({ movieCount, bookingCount });
  } catch (error) {
    next(error);
  }
});

app.post("/api/bookings", async (req, res, next) => {
  try {
    const { movieId, showtimeId, seats, customerName, email, phone } = req.body;

    if (!movieId || !showtimeId || !Array.isArray(seats) || seats.length === 0) {
      return res.status(400).json({ message: "Movie, showtime, and seats are required." });
    }

    if (!customerName || !email) {
      return res.status(400).json({ message: "Customer name and email are required." });
    }

    if (!emailRegex.test(String(email).trim())) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    const normalizedSeats = [...new Set(seats.map((seat) => String(seat).trim().toUpperCase()))];

    const movie = await Movie.findById(movieId);

    if (!movie) {
      return res.status(404).json({ message: "Movie not found." });
    }

    const showtime = movie.showtimes.id(showtimeId);

    if (!showtime) {
      return res.status(404).json({ message: "Showtime not found." });
    }

    const invalidSeats = normalizedSeats.filter(
      (seat) =>
        !showtime.availableSeats.includes(seat) || showtime.bookedSeats.includes(seat)
    );

    if (invalidSeats.length > 0) {
      return res.status(409).json({
        message: "Some seats are no longer available.",
        invalidSeats
      });
    }

    showtime.bookedSeats = [...showtime.bookedSeats, ...normalizedSeats];
    await movie.save();

    const booking = await Booking.create({
      movieId: movie._id,
      movieTitle: movie.title,
      showtimeId: showtime._id,
      showDate: showtime.dateLabel,
      showTime: showtime.startTime,
      screen: showtime.screen,
      seats: normalizedSeats,
      totalAmount: normalizedSeats.length * showtime.price,
      customerName: String(customerName).trim(),
      email: String(email).trim().toLowerCase(),
      phone: String(phone || "").trim()
    });

    const bookingCode = `CR-${String(booking._id).slice(-6).toUpperCase()}`;

    res.status(201).json({
      message: "Booking confirmed.",
      booking: {
        id: booking._id,
        bookingCode,
        movieTitle: booking.movieTitle,
        seats: booking.seats,
        totalAmount: booking.totalAmount,
        customerName: booking.customerName,
        showDate: booking.showDate,
        showTime: booking.showTime,
        screen: booking.screen,
        createdAt: booking.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Something went wrong on the server." });
});

connectDatabase()
  .then(() => {
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Database connection failed", error);
    process.exit(1);
  });
