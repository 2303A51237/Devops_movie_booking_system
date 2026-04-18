import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "";
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

const formatDateTime = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short"
  });
};

const uniqueGenres = (movies) => {
  const values = new Set();
  movies.forEach((movie) => {
    movie.genre.forEach((item) => values.add(item));
  });
  return ["All", ...Array.from(values)];
};

function App() {
  const [movies, setMovies] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [selectedMovieId, setSelectedMovieId] = useState("");
  const [selectedShowtimeId, setSelectedShowtimeId] = useState("");
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [formState, setFormState] = useState({
    customerName: "",
    email: "",
    phone: ""
  });
  const [search, setSearch] = useState("");
  const [genreFilter, setGenreFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState(null);

  const loadMovies = useCallback(async () => {
    const response = await fetch(`${API_BASE}/api/movies`);
    if (!response.ok) {
      throw new Error("Unable to load movies right now.");
    }
    return response.json();
  }, []);

  const loadBookings = useCallback(async () => {
    const response = await fetch(`${API_BASE}/api/bookings`);
    if (!response.ok) {
      throw new Error("Unable to load booking history right now.");
    }
    return response.json();
  }, []);

  const refreshAllData = useCallback(async () => {
    const [moviesData, bookingsData] = await Promise.all([loadMovies(), loadBookings()]);
    setMovies(moviesData);
    setBookings(bookingsData);

    return moviesData;
  }, [loadMovies, loadBookings]);

  useEffect(() => {
    const initialize = async () => {
      try {
        const moviesData = await refreshAllData();
        if (moviesData.length > 0) {
          setSelectedMovieId(moviesData[0].id);
          setSelectedShowtimeId(moviesData[0].showtimes[0]?.id || "");
        }
      } catch (fetchError) {
        setError(fetchError.message);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [refreshAllData]);

  const genres = useMemo(() => uniqueGenres(movies), [movies]);

  const filteredMovies = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return movies.filter((movie) => {
      const matchesGenre = genreFilter === "All" || movie.genre.includes(genreFilter);
      const matchesSearch =
        normalizedSearch.length === 0 ||
        movie.title.toLowerCase().includes(normalizedSearch) ||
        movie.genre.some((item) => item.toLowerCase().includes(normalizedSearch)) ||
        movie.language.toLowerCase().includes(normalizedSearch);
      return matchesGenre && matchesSearch;
    });
  }, [movies, search, genreFilter]);

  useEffect(() => {
    if (filteredMovies.length === 0) {
      setSelectedMovieId("");
      setSelectedShowtimeId("");
      setSelectedSeats([]);
      return;
    }

    const selectedExists = filteredMovies.some((movie) => movie.id === selectedMovieId);
    if (!selectedExists) {
      setSelectedMovieId(filteredMovies[0].id);
      setSelectedShowtimeId(filteredMovies[0].showtimes[0]?.id || "");
      setSelectedSeats([]);
    }
  }, [filteredMovies, selectedMovieId]);

  const selectedMovie = useMemo(
    () => filteredMovies.find((movie) => movie.id === selectedMovieId) || null,
    [filteredMovies, selectedMovieId]
  );

  const selectedShowtime = useMemo(
    () =>
      selectedMovie?.showtimes.find((showtime) => showtime.id === selectedShowtimeId) ||
      null,
    [selectedMovie, selectedShowtimeId]
  );

  const selectedSeatCount = selectedSeats.length;
  const baseAmount = selectedShowtime ? selectedSeatCount * selectedShowtime.price : 0;
  const convenienceFee = selectedSeatCount > 0 ? 30 : 0;
  const totalAmount = baseAmount + convenienceFee;

  const handleMovieSelect = (movieId) => {
    const movie = filteredMovies.find((entry) => entry.id === movieId);
    setSelectedMovieId(movieId);
    setSelectedShowtimeId(movie?.showtimes[0]?.id || "");
    setSelectedSeats([]);
    setConfirmation(null);
    setError("");
  };

  const handleShowtimeSelect = (showtimeId) => {
    setSelectedShowtimeId(showtimeId);
    setSelectedSeats([]);
    setConfirmation(null);
    setError("");
  };

  const toggleSeat = (seat) => {
    if (!selectedShowtime || selectedShowtime.bookedSeats.includes(seat)) {
      return;
    }

    setSelectedSeats((currentSeats) =>
      currentSeats.includes(seat)
        ? currentSeats.filter((currentSeat) => currentSeat !== seat)
        : [...currentSeats, seat]
    );
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormState((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setConfirmation(null);

    try {
      const response = await fetch(`${API_BASE}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          movieId: selectedMovieId,
          showtimeId: selectedShowtimeId,
          seats: selectedSeats,
          ...formState
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Booking failed.");
      }

      setConfirmation(data.booking);
      setSelectedSeats([]);
      setFormState({ customerName: "", email: "", phone: "" });

      await refreshAllData();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-screen">Loading showtimes...</div>;
  }

  if (error && movies.length === 0) {
    return <div className="loading-screen">Error: {error}</div>;
  }

  return (
    <div className="app-shell">
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">CineReserve</p>
          <h1>Book the next big-screen moment before the lights go down.</h1>
          <p className="hero-text">
            Browse hand-picked releases, compare showtimes, choose your seats,
            and confirm tickets in a single flow powered by React, Express, and MongoDB.
          </p>
          <div className="hero-metrics">
            <div>
              <strong>{movies.length}</strong>
              <span>Now showing</span>
            </div>
            <div>
              <strong>{movies.reduce((sum, movie) => sum + movie.showtimes.length, 0)}</strong>
              <span>Daily screenings</span>
            </div>
            <div>
              <strong>{bookings.length}</strong>
              <span>Recent bookings</span>
            </div>
          </div>
        </div>
        <div className="hero-panel">
          <p className="panel-label">Tonight&apos;s top pick</p>
          <h2>{selectedMovie?.title || "Pick a movie"}</h2>
          <p>
            {selectedMovie?.synopsis ||
              "Use the filters below to choose your movie and start booking."}
          </p>
          <div className="chip-row">
            {selectedMovie?.genre.map((item) => (
              <span key={item} className="chip">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <main className="content-grid">
        <section className="movies-panel">
          <div className="section-heading">
            <h3>Choose a movie</h3>
            <p>Search and filter movies, then pick your show.</p>
          </div>

          <div className="filters">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title, genre, language"
              aria-label="Search movies"
            />
            <select
              value={genreFilter}
              onChange={(event) => setGenreFilter(event.target.value)}
              aria-label="Filter by genre"
            >
              {genres.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>

          <div className="movie-grid">
            {filteredMovies.map((movie) => (
              <button
                key={movie.id}
                className={`movie-card ${selectedMovieId === movie.id ? "active" : ""}`}
                type="button"
                onClick={() => handleMovieSelect(movie.id)}
              >
                <div
                  className="movie-poster"
                  style={{ backgroundImage: movie.posterAccent }}
                />
                <div className="movie-card-body">
                  <div className="movie-card-top">
                    <h4>{movie.title}</h4>
                    <span>{movie.rating}</span>
                  </div>
                  <p>
                    {movie.duration} | {movie.language}
                  </p>
                  <p>{movie.experience}</p>
                </div>
              </button>
            ))}

            {filteredMovies.length === 0 ? (
              <p className="empty-state">No movies found for current filters.</p>
            ) : null}
          </div>
        </section>

        <section className="booking-panel">
          <div className="section-heading">
            <h3>Showtimes and seats</h3>
            <p>Pick a show, then tap seats to build your booking.</p>
          </div>

          <div className="showtime-list">
            {selectedMovie?.showtimes.map((showtime) => (
              <button
                key={showtime.id}
                className={`showtime-card ${selectedShowtimeId === showtime.id ? "active" : ""}`}
                type="button"
                onClick={() => handleShowtimeSelect(showtime.id)}
              >
                <strong>{showtime.startTime}</strong>
                <span>{showtime.dateLabel}</span>
                <span>{showtime.screen}</span>
                <span>{showtime.seatsLeft} seats left</span>
                <span>{currencyFormatter.format(showtime.price)}</span>
              </button>
            ))}
          </div>

          <div className="screen">Screen This Way</div>

          <div className="seat-grid" aria-label="Seat selection">
            {selectedShowtime?.availableSeats.map((seat) => {
              const isBooked = selectedShowtime.bookedSeats.includes(seat);
              const isSelected = selectedSeats.includes(seat);

              return (
                <button
                  key={seat}
                  className={`seat ${isBooked ? "booked" : ""} ${isSelected ? "selected" : ""}`}
                  type="button"
                  onClick={() => toggleSeat(seat)}
                  disabled={isBooked}
                >
                  {seat}
                </button>
              );
            })}
          </div>

          <div className="legend">
            <span>
              <i className="seat-dot available" />Available
            </span>
            <span>
              <i className="seat-dot selected" />Selected
            </span>
            <span>
              <i className="seat-dot booked" />Booked
            </span>
          </div>
        </section>

        <section className="summary-panel">
          <div className="section-heading">
            <h3>Booking summary</h3>
            <p>Complete your details to reserve your tickets.</p>
          </div>

          <div className="summary-card">
            <div className="summary-row">
              <span>Movie</span>
              <strong>{selectedMovie?.title || "--"}</strong>
            </div>
            <div className="summary-row">
              <span>Show</span>
              <strong>
                {selectedShowtime
                  ? `${selectedShowtime.dateLabel}, ${selectedShowtime.startTime}`
                  : "--"}
              </strong>
            </div>
            <div className="summary-row">
              <span>Seats</span>
              <strong>{selectedSeats.length > 0 ? selectedSeats.join(", ") : "--"}</strong>
            </div>
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{currencyFormatter.format(baseAmount)}</strong>
            </div>
            <div className="summary-row">
              <span>Convenience fee</span>
              <strong>{currencyFormatter.format(convenienceFee)}</strong>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <strong>{currencyFormatter.format(totalAmount)}</strong>
            </div>
          </div>

          <form className="booking-form" onSubmit={handleSubmit}>
            <label htmlFor="customerName">Full name</label>
            <input
              id="customerName"
              name="customerName"
              value={formState.customerName}
              onChange={handleFormChange}
              placeholder="Enter your name"
              required
            />

            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formState.email}
              onChange={handleFormChange}
              placeholder="you@example.com"
              required
            />

            <label htmlFor="phone">Phone</label>
            <input
              id="phone"
              name="phone"
              value={formState.phone}
              onChange={handleFormChange}
              placeholder="Optional contact number"
            />

            {error ? <p className="feedback error">{error}</p> : null}
            {confirmation ? (
              <p className="feedback success">
                {confirmation.bookingCode || "Booking"} confirmed for {confirmation.movieTitle} on {" "}
                {confirmation.showDate} at {confirmation.showTime}. Seats: {" "}
                {confirmation.seats.join(", ")}.
              </p>
            ) : null}

            <button
              className="primary-button"
              type="submit"
              disabled={
                submitting ||
                !selectedMovieId ||
                !selectedShowtimeId ||
                selectedSeats.length === 0
              }
            >
              {submitting ? "Confirming..." : "Confirm Booking"}
            </button>
          </form>

          <div className="history-panel">
            <h4>Recent bookings</h4>
            {bookings.length === 0 ? (
              <p className="history-empty">No bookings yet.</p>
            ) : (
              <div className="history-list">
                {bookings.map((booking) => (
                  <article key={booking.id} className="history-item">
                    <div>
                      <strong>{booking.movieTitle}</strong>
                      <p>
                        {booking.showDate}, {booking.showTime} | {booking.screen}
                      </p>
                    </div>
                    <div>
                      <p>Seats: {booking.seats.join(", ")}</p>
                      <p>{currencyFormatter.format(booking.totalAmount)}</p>
                      <p>{formatDateTime(booking.createdAt)}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
