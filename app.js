class YouTubeApp {
  constructor() {
    this.videos = [];
    this.nextPageToken = "";
    this.isLoading = false;
    this.currentIndex = 0;
    this.allVideos = [];
    this.batchSize = 6;
    this.isSearchMode = false;
    this.searchQuery = "";

    this.videosContainer = document.getElementById("videos-container");
    this.loader = document.getElementById("loader");
    this.searchInput = document.getElementById("searchInput");
    this.searchButton = document.getElementById("searchButton");

    this.init();
  }

  init() {
    this.fetchAllVideos();
    this.setupInfiniteScroll();
    this.setupSearchListeners();
  }

  setupSearchListeners() {
    // Real-time search with debouncing
    this.searchInput.addEventListener("input", (event) => {
      // Clear any existing timeout
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }

      // Set new timeout
      this.debounceTimeout = setTimeout(() => {
        const query = event.target.value.trim();
        if (query.length >= 2) {
          // Only search if query is at least 2 characters
          this.handleSearch(query);
        } else if (query.length === 0) {
          // Reset to trending videos if search is cleared
          this.resetToTrending();
        }
      }, this.DEBOUNCE_DELAY);
    });

    // Keep the button for mobile users or those who prefer clicking
    this.searchButton.addEventListener("click", () => {
      const query = this.searchInput.value.trim();
      if (query) {
        this.handleSearch(query);
      }
    });

    // Handle Enter key
    this.searchInput.addEventListener("keypress", (event) => {
      if (event.key === "Enter") {
        const query = this.searchInput.value.trim();
        if (query) {
          // Clear debounce timeout if user presses enter
          if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
          }
          this.handleSearch(query);
        }
      }
    });
  }

  async resetToTrending() {
    this.isSearchMode = false;
    this.searchQuery = "";
    this.currentIndex = 0;
    this.videosContainer.innerHTML = "";
    await this.fetchAllVideos();
  }

  async handleSearch(query) {
    if (query === this.searchQuery) return; // Avoid duplicate searches

    this.isSearchMode = true;
    this.searchQuery = query;
    this.currentIndex = 0;
    this.videosContainer.innerHTML = "";

    // Show loading state
    this.showLoadingState();

    await this.fetchSearchResults();
  }

  showLoadingState() {
    // Add a loading class to the search input
    this.searchInput.classList.add("loading");
    this.loader.classList.add("active");
  }

  hideLoadingState() {
    // Remove the loading class
    this.searchInput.classList.remove("loading");
    this.loader.classList.remove("active");
  }

  async fetchSearchResults() {
    if (this.isLoading) return;

    this.isLoading = true;

    try {
      const params = new URLSearchParams({
        part: "snippet",
        maxResults: "50",
        q: this.searchQuery,
        type: "video",
        key: CONFIG.API_KEY,
      });

      const searchResponse = await fetch(
        `https://youtube.googleapis.com/youtube/v3/search?${params}`
      );
      const searchData = await searchResponse.json();

      if (searchData.error) {
        throw new Error(searchData.error.message);
      }

      if (searchData.items.length === 0) {
        this.showNoResults();
        return;
      }

      // Get video IDs from search results
      const videoIds = searchData.items
        .map((item) => item.id.videoId)
        .join(",");

      // Fetch detailed video information
      const videoParams = new URLSearchParams({
        part: "snippet,contentDetails,statistics",
        id: videoIds,
        key: CONFIG.API_KEY,
      });

      const videoResponse = await fetch(
        `${CONFIG.API_BASE_URL}?${videoParams}`
      );
      const videoData = await videoResponse.json();

      if (videoData.error) {
        throw new Error(videoData.error.message);
      }

      this.allVideos = videoData.items;
      await this.showNextBatch();
    } catch (error) {
      console.error("Error fetching search results:", error);
      this.showError(error.message);
    } finally {
      this.isLoading = false;
      this.hideLoadingState();
    }
  }

  showNoResults() {
    this.videosContainer.innerHTML = `
      <div class="no-results">
        <h2>No results found</h2>
        <p>Try different keywords or remove search filters</p>
      </div>
    `;
  }

  showError(message) {
    this.videosContainer.innerHTML = `
      <div class="error-message">
        <h2>Something went wrong</h2>
        <p>${message}</p>
      </div>
    `;
  }

  async fetchAllVideos() {
    if (this.isLoading || this.isSearchMode) return;

    this.isLoading = true;
    this.loader.classList.add("active");

    try {
      const params = new URLSearchParams({
        part: "snippet,contentDetails,statistics",
        chart: "mostPopular",
        maxResults: "50",
        regionCode: CONFIG.REGION_CODE,
        key: CONFIG.API_KEY,
      });

      const response = await fetch(`${CONFIG.API_BASE_URL}?${params}`);
      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      this.allVideos = data.items;
      await this.showNextBatch();
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      this.isLoading = false;
      this.loader.classList.remove("active");
    }
  }

  async showNextBatch() {
    return new Promise((resolve) => {
      if (this.currentIndex >= this.allVideos.length) {
        this.loader.classList.remove("active");
        resolve(false);
        return;
      }

      this.loader.classList.add("active");

      setTimeout(() => {
        const nextBatch = this.allVideos.slice(
          this.currentIndex,
          this.currentIndex + this.batchSize
        );

        this.renderVideos(nextBatch);
        this.currentIndex += this.batchSize;

        this.loader.classList.remove("active");

        resolve(this.currentIndex < this.allVideos.length);
      }, 800);
    });
  }

  renderVideos(videos) {
    videos.forEach((videoInfo) => {
      const videoCard = new VideoCard(videoInfo);
      this.videosContainer.appendChild(videoCard.render());
    });
  }

  setupInfiniteScroll() {
    let scrollTimeout;

    window.addEventListener("scroll", () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }

      scrollTimeout = setTimeout(async () => {
        const { scrollTop, clientHeight, scrollHeight } =
          document.documentElement;

        if (scrollTop + clientHeight >= scrollHeight - 100 && !this.isLoading) {
          this.isLoading = true;

          const hasMoreVideos = await this.showNextBatch();

          if (!hasMoreVideos) {
            this.loader.classList.remove("active");
            console.log("All videos have been loaded");
          }

          this.isLoading = false;
        }
      }, 100);
    });
  }

  isLastBatch() {
    return this.currentIndex + this.batchSize >= this.allVideos.length;
  }
}

const app = new YouTubeApp();
