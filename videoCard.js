class VideoCard {
  constructor(videoInfo) {
    this.info = videoInfo;
  }

  formatViewCount(count) {
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count;
  }

  render() {
    const { snippet, statistics } = this.info;
    const { channelTitle, title, thumbnails } = snippet;

    const cardElement = document.createElement("div");
    cardElement.className = "video-card";

    cardElement.innerHTML = `
            <img 
                class="video-thumbnail"
                src="${thumbnails.high.url}"
                alt="${title}"
            />
            <div class="video-info">
                <div class="video-title">${title}</div>
                <div class="channel-title">${channelTitle}</div>
                <div class="view-count">${this.formatViewCount(
                  statistics.viewCount
                )} views</div>
            </div>
        `;

    return cardElement;
  }
}
