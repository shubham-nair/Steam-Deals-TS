import React, { useState } from 'react';
import './App.css';

interface Deal {
  title: string;
  salePrice: string;
  normalPrice: string;
  savings: string;
  dealID: string;
  thumb: string;
  gameID: string;
}

interface GameInfo {
  [key: string]: {
    thumb: string;
  }
}

const App: React.FC = () => {
  const [title, setTitle] = useState<string>('');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [gameInfo, setGameInfo] = useState<GameInfo>({});

  const fetchGameInfo = async (gameIDs: string[]): Promise<void> => {
    try {
      const uniqueGameIDs = [...new Set(gameIDs)];
      const gameInfoPromises = uniqueGameIDs.map(gameID =>
        fetch(`https://www.cheapshark.com/api/1.0/games?id=${gameID}`).then(res => res.json())
      );
      
      const results = await Promise.all(gameInfoPromises);
      const newGameInfo: GameInfo = {};
      
      results.forEach((info, index) => {
        if (info && info.info) {
          newGameInfo[uniqueGameIDs[index]] = {
            thumb: info.info.thumb || ''
          };
        }
      });
      
      setGameInfo(prev => ({ ...prev, ...newGameInfo }));
    } catch (err) {
      console.error('Error fetching game info:', err);
    }
  };

  const fetchDeals = async (): Promise<void> => {
    if (!title.trim()) return;
    
    setLoading(true);
    setError('');
    setHasSearched(true);
    
    try {
      const response = await fetch(
        `https://www.cheapshark.com/api/1.0/deals?storeID=1&title=${encodeURIComponent(title)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch deals');
      }
      
      const data: Deal[] = await response.json();
      setDeals(data);

      // Fetch additional game info for better quality images
      const gameIDs = data.map(deal => deal.gameID);
      if (gameIDs.length > 0) {
        fetchGameInfo(gameIDs);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setDeals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    fetchDeals();
  };

  // Function to handle image loading errors
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>): void => {
    e.currentTarget.src = 'https://via.placeholder.com/120x45/3a3442/7a918d?text=No+Image';
  };

  // Function to get the best available image
  const getBestImage = (deal: Deal): string => {
    // Try to get the higher quality image from gameInfo
    const highResImage = gameInfo[deal.gameID]?.thumb;
    if (highResImage) {
      return highResImage;
    }
    // Fallback to the deal thumbnail
    return deal.thumb;
  };

  return (
    <main className="app-container">
      <header>
        <h1>Steam Game Deals</h1>
      </header>
      
      <section aria-label="Search for games">
        <form className="search-form" onSubmit={handleSubmit}>
          <label htmlFor="game-search" className="visually-hidden">Game title</label>
          <input
            id="game-search"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter game title..."
            aria-label="Game title"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </section>

      {error && <section role="alert" className="error">{error}</section>}
      
      {loading && <section className="loading">Loading deals...</section>}

      {!loading && hasSearched && deals.length === 0 && (
        <section className="no-results">
          <p>No deals found for "{title}"</p>
        </section>
      )}

      {deals.length > 0 && (
        <section aria-label="Game deals" className="deals-section">
          <h2 className="visually-hidden">Game Deals Results</h2>
          <ul className="deals-list">
            {deals.map((deal) => (
              <li key={deal.dealID} className="deal-card">
                <div className="deal-image">
                  <img 
                    src={getBestImage(deal)}
                    alt={`${deal.title} thumbnail`} 
                    onError={handleImageError}
                    loading="lazy"
                  />
                </div>
                <div className="deal-content">
                  <h3 className="deal-title">{deal.title}</h3>
                  <div className="deal-info">
                    <div className="price-info">
                      <p className="sale-price">Sale Price: ${deal.salePrice}</p>
                      <p className="normal-price">Normal Price: ${deal.normalPrice}</p>
                      <p className="savings">
                        Savings: {Math.round(parseFloat(deal.savings))}%
                      </p>
                    </div>
                    <a
                      href={`https://www.cheapshark.com/redirect?dealID=${deal.dealID}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="deal-link"
                    >
                      View Deal on Steam
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
};

export default App;
