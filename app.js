class YouTubeApp {
  constructor() {
    this.videos = [];
    this.nextPageToken = "";
    this.isLoading = false;
    this.currentIndex = 0;
    this.allVideos = [];
    this.batchSize = 6; 

    this.videosContainer = document.getElementById("videos-container");
    this.loader = document.getElementById("loader");

    this.init();
  }

  init() {
    this.fetchAllVideos();
    this.setupInfiniteScroll();
  }

  async fetchAllVideos() {
    if (this.isLoading) return;

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
