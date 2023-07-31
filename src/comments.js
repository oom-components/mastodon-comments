export default class Mastodon extends HTMLElement {
  static get observedAttributes() {
    return ["src"];
  }

  connectedCallback() {
    const lang = this.closest("[lang]")?.lang || "en";

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
    const api_url = `${origin}/api/v1/statuses/${id}/context`;
    const response = await fetch(api_url);
    const data = await response.json();

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
    const utils = {
      formatEmojis,
      formatDate: (date) => this.dateTimeFormatter.format(new Date(date)),
    };

    for (const reply of replies) {
      const comment = document.createElement("li");

      comment.innerHTML = Mastodon.renderComment(reply.comment, utils);

      if (reply.replies.length) {
        this.render(comment, reply.replies);
      }
      ul.appendChild(comment);
    }

    container.appendChild(ul);
  }

  static renderComment(comment, utils) {
    const { account } = comment;

    return `
        <article id="comment-${comment.id}">
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
            ${comment.favourites_count ? `♥️ ${comment.favourites_count}` : ""}
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
