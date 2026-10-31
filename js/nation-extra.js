// ══ NATION EXTRAS — js/nation-extra.js ══════════════════════════════════
// ANV-43. Shared by the player wiki nation page (js/wiki.js) and the DM
// Tools nation view (dm.html). Renders nations.description (markdown, bold
// and italic only) and the nations.extra_data keys: epithet, motto,
// sigil, origin_title, origin_legend, color_and_creatures, rivalries
// ({with, text} only -- `tone` is never shown), at_a_glance, leader,
// accord_contribution.
//
// extra_data.dm_only is DM eyes only. It is read ONLY when opts.dm === true
// (DM Tools). The player wiki calls this with dm false/absent, and
// NationExtra.stripDmOnly() additionally removes the key from the in-memory
// nation rows the wiki loads, so the text cannot reach any render path.
(function(root) {
  'use strict';

  var SIGIL_NATIONS = ['solenmere', 'zippan', 'bunari', 'janiveth', 'dingurei', 'opuri'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Bold and italic only. Everything is HTML-escaped first, so no markup in
  // the source can survive; only the two emphasis forms below are turned
  // into tags. Blank lines separate paragraphs, single newlines are <br>.
  function md(text) {
    if (!text) return '';
    return String(text).split(/\n{2,}/).map(function(para) {
      var h = esc(para.trim());
      h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      h = h.replace(/(^|[^*])\*([^*\s][^*]*?)\*(?!\*)/g, '$1<em>$2</em>');
      h = h.replace(/\n/g, '<br>');
      return h ? '<p>' + h + '</p>' : '';
    }).join('');
  }
  function mdInline(text) {
    return md(text).replace(/^<p>/, '').replace(/<\/p>$/, '').replace(/<\/p><p>/g, '<br><br>');
  }

  var NX = { md: md, mdInline: mdInline };

  NX.sigilUrl = function(id) {
    return SIGIL_NATIONS.indexOf(id) >= 0 ? 'assets/images/sigils/sigil-' + id + '.svg' : null;
  };

  // Sigil + epithet + motto strip shown above the description.
  NX.topHtml = function(n) {
    var x = (n && n.extra_data) || {};
    var url = NX.sigilUrl(n.id);
    if (!url && !x.motto && !x.epithet) return '';
    var sig = x.sigil || {};
    return '<div class="nx-top">'
      + (url ? '<img class="nx-sigil" src="' + esc(url) + '" alt="Sigil of ' + esc(n.name) + '" onerror="this.style.display=\'none\'">' : '')
      + '<div class="nx-top-text">'
      + (x.epithet ? '<div class="nx-epithet">' + esc(x.epithet) + '</div>' : '')
      + (x.motto ? '<div class="nx-motto">“' + esc(x.motto) + '”</div>' : '')
      + (sig.design ? '<div class="nx-sigil-design">' + esc(sig.design) + '</div>' : '')
      + '</div></div>';
  };

  NX.descriptionHtml = function(n) {
    return n && n.description ? '<div class="nx-body">' + md(n.description) + '</div>' : '';
  };

  // Sections that follow the description. opts.dm adds the DM-only box.
  NX.sectionsHtml = function(n, opts) {
    var x = (n && n.extra_data) || {};
    var out = '';
    if (x.origin_legend) {
      out += '<div class="nx-h">How They Began' + (x.origin_title ? ': ' + esc(x.origin_title) : '') + '</div>'
        + '<div class="nx-body">' + md(x.origin_legend) + '</div>';
    }
    if (x.color_and_creatures) {
      out += '<div class="nx-h">Color and Creatures</div><div class="nx-body">' + md(x.color_and_creatures) + '</div>';
    }
    if (Array.isArray(x.rivalries) && x.rivalries.length) {
      out += '<div class="nx-h">Rivalries</div><div class="nx-rivals">'
        + x.rivalries.map(function(r) {
            return '<div class="nx-rival"><b>' + esc(r.with) + '</b><p>' + mdInline(r.text) + '</p></div>';
          }).join('') + '</div>';
    }
    if (x.at_a_glance && typeof x.at_a_glance === 'object') {
      var keys = Object.keys(x.at_a_glance);
      if (keys.length) {
        out += '<div class="nx-h">At a Glance</div><dl class="nx-glance">'
          + keys.map(function(k) { return '<dt>' + esc(k) + '</dt><dd>' + mdInline(x.at_a_glance[k]) + '</dd>'; }).join('')
          + '</dl>';
      }
    }
    if (x.leader && (x.leader.name || x.leader.title)) {
      out += '<div class="nx-h">Leader</div><div class="nx-leader"><small>' + esc(x.leader.title || '') + '</small>'
        + '<b>' + esc(x.leader.name || '') + '</b>'
        + (x.leader.note ? '<p>' + mdInline(x.leader.note) + '</p>' : '') + '</div>';
    }
    if (x.accord_contribution) {
      out += '<div class="nx-h">At the Signing</div><div class="nx-body">' + md(x.accord_contribution) + '</div>';
    }
    if (opts && opts.dm === true && Array.isArray(x.dm_only) && x.dm_only.length) {
      out += '<div class="nx-dm"><div class="nx-dm-title">DM Only</div><ul>'
        + x.dm_only.map(function(t) { return '<li>' + mdInline(t) + '</li>'; }).join('') + '</ul></div>';
    }
    return out;
  };

  // Removes extra_data.dm_only from every nation row, in place. The player
  // wiki calls this on each batch of rows it loads.
  NX.stripDmOnly = function(rows) {
    (rows || []).forEach(function(n) {
      if (n && n.extra_data && typeof n.extra_data === 'object' && 'dm_only' in n.extra_data) delete n.extra_data.dm_only;
    });
    return rows;
  };

  root.NationExtra = NX;
  if (typeof module !== 'undefined' && module.exports) module.exports = NX;
})(typeof window !== 'undefined' ? window : globalThis);
