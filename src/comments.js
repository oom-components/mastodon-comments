// © https://phosphoricons.com/
const icons = {
  reblog:
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="24"><polyline points="200 88 224 64 200 40"/><path d="M32,128A64,64,0,0,1,96,64H224"/><polyline points="56 168 32 192 56 216"/><path d="M224,128a64,64,0,0,1-64,64H32"/></svg>`,
  favourite:
    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 256 256" fill="currentColor"><path d="M240,94c0,70-103.79,126.66-108.21,129a8,8,0,0,1-7.58,0C119.79,220.66,16,164,16,94A62.07,62.07,0,0,1,78,32c20.65,0,38.73,8.88,50,23.89C139.27,40.88,157.35,32,178,32A62.07,62.07,0,0,1,240,94Z"/></svg>`,
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
    const { origin, pathname } = new URL(url);
    const [_, id] = pathname.match(/\/(\d+)$/);
    const data = await Mastodon.fetch(
      new URL(`${origin}/api/v1/statuses/${id}/context`),
    );

    // Sort data
    const comments = new Map();
    const root = {
      replies: [],
    };
    comments.set(id, root);

    for (const toot of data.descendants) {
      const comment = {
        comment: toot,
        replies: [],
      };

      comments.get(toot.in_reply_to_id)?.replies.push(comment);
      comments.set(toot.id, comment);
    }

    this.render(this, root.replies);
  }

  render(container, replies) {
    const ul = document.createElement("ul");

    for (const reply of replies) {
      const comment = document.createElement("li");

      comment.innerHTML = Mastodon.renderComment(reply.comment);

      if (reply.replies.length) {
        this.render(comment, reply.replies);
      }
      ul.appendChild(comment);
    }

    container.appendChild(ul);
  }

  static async fetch(url) {
    const response = await fetch(url);
    return await response.json();
  }

  static renderComment(comment) {
    const { account } = comment;
    const { utils } = Mastodon;

    return `
        <article class="comment" id="comment-${comment.id}">
          <footer class="comment-footer">
            <a href="${account.url}" class="comment-user">
              <img class="comment-avatar" src="${account.avatar_static}" alt="${account.display_name}'s avatar" width="200" height="200">
              <strong class="comment-username">
                ${utils.formatEmojis(account.display_name, account.emojis)}
              </strong>
              <em class="comment-useraddress">
                @${account.username}@${new URL(account.url).hostname}
              </em>
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
