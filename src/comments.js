// © https://phosphoricons.com/
const icons = {
  reblog:
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="24"><polyline points="200 88 224 64 200 40"/><path d="M32,128A64,64,0,0,1,96,64H224"/><polyline points="56 168 32 192 56 216"/><path d="M224,128a64,64,0,0,1-64,64H32"/></svg>`,
  favourite:
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M240,94c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,220.66,16,164,16,94A62.07,62.07,0,0,1,78,32c20.65,0,38.73,8.88,50,23.89C139.27,40.88,157.35,32,178,32A62.07,62.07,0,0,1,240,94Z"/></svg>`,
  author:
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor" class="comment-author"><path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm45.66,85.66-56,56a8,8,0,0,1-11.32,0l-24-24a8,8,0,0,1,11.32-11.32L112,148.69l50.34-50.35a8,8,0,0,1,11.32,11.32Z"></path></svg>`,
};

const dateTimeFormatter = new Intl.DateTimeFormat(
  document.documentElement.lang || navigator.language || "en",
  {
    dateStyle: "medium",
    timeStyle: "short",
  },
);

export default class Mastodon extends HTMLElement {
  static get observedAttributes() {
    return ["src"];
  }

  static utils = {
    formatEmojis,
    formatDate: (date) => dateTimeFormatter.format(new Date(date)),
    icons,
  };

  connectedCallback() {
    const lang = this.closest("[lang]")?.lang || navigator.language || "en";

    this.dateTimeFormatter = new Intl.DateTimeFormat(lang, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  attributeChangedCallback(name, _oldValue, newValue) {
    if (name === "src") {
      this.fetchComments(newValue);
      return;
    }
  }

  async fetchComments(url) {
    const tootUrl = new URL(url);
    const { origin, pathname } = tootUrl;
    let id;

    // In case it’s a a Pleroma server, with /notice/ URLs.
    if (pathname.includes("/notice/")) {
      [, id] = pathname.match(/^\/notice\/([^\/?#]+)/);
    } else {
      [, id] = pathname.match(/\/(\d+)$/);
    }

    if (!id) {
      return;
    }

    const data = await Mastodon.fetch(
      new URL(`${origin}/api/v1/statuses/${id}/context`),
      Number(this.getAttribute("cache") || 0),
    );

    // Sort data
    const comments = new Map();
    const root = {
      replies: [],
    };
    comments.set(id, root);

    for (const toot of data.descendants) {
      if (toot.visibility !== "public") {
        continue;
      }

      const comment = {
        comment: toot,
        replies: [],
      };

      comments.get(toot.in_reply_to_id)?.replies.push(comment);
      comments.set(toot.id, comment);
    }

    // Get the user's author
    const user = tootUrl.pathname.split("/")[1];
    const account = `${user}@${tootUrl.hostname}`;

    if (root.replies.length) {
      this.innerHTML = "";
      this.render(this, root.replies, account);
    }
  }

  render(container, replies, account) {
    const ul = document.createElement("ul");

    for (const reply of replies) {
      const comment = document.createElement("li");

      comment.innerHTML = Mastodon.renderComment(reply.comment, account);

      if (reply.replies.length) {
        this.render(comment, reply.replies, account);
      }
      ul.appendChild(comment);
    }

    container.appendChild(ul);
  }

  static async fetch(url, ttl) {
    const cache = await caches.open("mastodon-comments");
    let cached = await cache.match(url);

    if (cached && ttl) {
      const cacheTime = new Date(cached.headers.get("x-cached-at"));
      const diff = Date.now() - cacheTime.getTime();

      if (diff <= ttl * 1000) {
        return await cached.json();
      }
    }

    try {
      const response = await fetch(url);
      const body = await response.json();

      cached = new Response(JSON.stringify(body));
      cached.headers.set("x-cached-at", new Date());
      cached.headers.set("content-type", "application/json; charset=utf-8");
      await cache.put(url, cached);
      return body;
    } catch {
      if (cached) {
        return await cached.json();
      }
    }
  }

  static renderComment(comment, mainAccount) {
    const { account } = comment;
    const { utils } = Mastodon;
    const useraddress = `@${account.username}@${new URL(account.url).hostname}`;

    return `
        <article class="comment" id="comment-${comment.id}">
          <footer class="comment-footer">
            <a href="${account.url}" class="comment-user">
              <img class="comment-avatar" src="${account.avatar_static}" alt="${account.display_name}'s avatar" width="200" height="200">
              ${useraddress === mainAccount ? utils.icons.author : ""}
              <strong class="comment-username">
                ${utils.formatEmojis(account.display_name, account.emojis)}
              </strong>
              <em class="comment-useraddress">${useraddress}</em>
            </a>
            <a href="${comment.url}" class="comment-address">
              <time class="comment-time" title="${comment.created_at}">
                ${utils.formatDate(comment.created_at)}
              </time>
            </a>
          </footer>
          <div class="comment-body">
            ${utils.formatEmojis(comment.content, comment.emojis)}

            <p class="comment-counts">
              ${
      comment.reblogs_count
        ? `<span>${utils.icons.reblog} ${comment.reblogs_count}</span>`
        : ""
    }
              ${
      comment.favourites_count
        ? `<span>${utils.icons.favourite} ${comment.favourites_count}</span>`
        : ""
    }
            </p>
          </div>
        </article>
      `;
  }
}

function formatEmojis(html, emojis) {
  emojis.forEach(({ shortcode, static_url, url }) => {
    html = html.replace(
      `:${shortcode}:`,
      `<picture>
        <source srcset="${url}" media="(prefers-reduced-motion: no-preference)">
        <img src="${static_url}" alt=":${shortcode}:" title=":${shortcode}:" width="16" height="16">
      </picture>`,
    );
  });
  return html;
}
