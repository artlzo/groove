/*
 * ui_sidebar.js — new grouped sidebar (Time Signature + Subdivision).
 *
 * Design: the engine (groove_writer.js) is untouched. The original subdivision
 * buttons and the time-signature popup remain in the DOM but hidden; they stay
 * the single source of truth. This module is a thin controller/mirror:
 *   - clicks on the new segmented controls call the existing engine methods
 *     (changeDivision, timeSigPopupClose) so all behavior is reused, and
 *   - MutationObservers watch the hidden legacy elements so the new UI always
 *     reflects the real engine state (selected division, disabled options,
 *     current time signature), no matter what triggered the change.
 */
(function () {
	function ready(fn) {
		if (document.readyState !== "loading") fn();
		else document.addEventListener("DOMContentLoaded", fn);
	}

	ready(function () {
		var gw = window.myGrooveWriter;
		if (!gw) return;

		var beatsSel = document.getElementById("gsBeatsSelect");
		var denomSel = document.getElementById("gsDenomSelect");
		var noteSeg = document.getElementById("gsNoteValueSeg");
		var feelSeg = document.getElementById("gsFeelSeg");
		var metroSeg = document.getElementById("gsMetronomeSeg");
		var timeSigLabel = document.getElementById("timeSigLabel");
		var popupTop = document.getElementById("timeSigPopupTimeSigTop");
		var popupBottom = document.getElementById("timeSigPopupTimeSigBottom");

		if (!beatsSel || !denomSel || !noteSeg || !feelSeg) return;

		// hidden legacy subdivision buttons, keyed by engine division number
		var legacy = {
			8: document.getElementById("subdivision_8ths"),
			16: document.getElementById("subdivision_16ths"),
			32: document.getElementById("subdivision_32ths"),
			12: document.getElementById("subdivision_12ths"),
			24: document.getElementById("subdivision_24ths"),
			48: document.getElementById("subdivision_48ths")
		};

		// hidden legacy metronome buttons, keyed by frequency
		var metroLegacy = {
			0: document.getElementById("metronomeOff"),
			4: document.getElementById("metronome4ths"),
			8: document.getElementById("metronome8ths"),
			16: document.getElementById("metronome16ths")
		};

		// engine division -> { value: note-value, feel: straight|triplets|mixed }
		var DIV_MAP = {
			8: { value: 8, feel: "straight" },
			16: { value: 16, feel: "straight" },
			32: { value: 32, feel: "straight" },
			12: { value: 8, feel: "triplets" },
			24: { value: 16, feel: "triplets" },
			48: { value: null, feel: "mixed" }
		};

		// (note-value, feel) -> engine division, or null when the engine has no
		// such subdivision (there is no 1/32 triplet in GrooveScribe).
		function toDivision(value, feel) {
			if (feel === "mixed") return 48;
			if (feel === "straight") return value; // 8 / 16 / 32
			if (feel === "triplets") {
				if (value === 8) return 12;
				if (value === 16) return 24;
				return null;
			}
			return null;
		}

		function hasClass(el, name) {
			return !!el && (" " + el.className + " ").indexOf(" " + name + " ") !== -1;
		}

		function currentDivision() {
			for (var d in legacy) {
				if (hasClass(legacy[d], "buttonSelected")) return parseInt(d, 10);
			}
			return 16; // sensible default until the engine sets its selection
		}

		// ---- clicks: drive the engine ------------------------------------
		noteSeg.addEventListener("click", function (e) {
			var btn = e.target.closest(".gs-seg-btn");
			if (!btn || btn.classList.contains("is-disabled")) return;
			var value = parseInt(btn.getAttribute("data-value"), 10);
			var st = DIV_MAP[currentDivision()] || DIV_MAP[16];
			// picking a note value while in "mixed" means dropping back to straight
			var feel = st.feel === "mixed" ? "straight" : st.feel;
			var div = toDivision(value, feel);
			if (div == null) return;
			gw.changeDivision(div);
		});

		feelSeg.addEventListener("click", function (e) {
			var btn = e.target.closest(".gs-seg-btn");
			if (!btn || btn.classList.contains("is-disabled")) return;
			var feel = btn.getAttribute("data-feel");
			var st = DIV_MAP[currentDivision()] || DIV_MAP[16];
			var value = st.value || 16;
			var div = toDivision(value, feel);
			// no 1/32 triplet — snap up to a 1/16 triplet instead
			if (div == null && feel === "triplets") div = 24;
			if (div == null) return;
			gw.changeDivision(div);
		});

		// ---- metronome ---------------------------------------------------
		if (metroSeg) {
			metroSeg.addEventListener("click", function (e) {
				var btn = e.target.closest(".gs-seg-btn");
				if (!btn || btn.classList.contains("is-disabled")) return;
				gw.setMetronomeFrequency(parseInt(btn.getAttribute("data-freq"), 10));
			});
		}

		function currentMetroFreq() {
			for (var f in metroLegacy) {
				if (hasClass(metroLegacy[f], "buttonSelected") || hasClass(metroLegacy[f], "selected")) {
					return parseInt(f, 10);
				}
			}
			return 0; // metronome defaults to Off
		}

		function syncMetronome() {
			if (!metroSeg) return;
			var freq = String(currentMetroFreq());
			[].forEach.call(metroSeg.querySelectorAll(".gs-seg-btn"), function (b) {
				b.classList.toggle("is-active", b.getAttribute("data-freq") === freq);
			});
		}

		// The engine positions the options menu with a -150px offset intended for
		// the old top-right anchor; from the left-edge sidebar that lands off-screen.
		// Re-anchor it just below the sidebar button after the engine opens it.
		var optionsAnchor = document.getElementById("metronomeOptionsAnchor");
		if (optionsAnchor) {
			optionsAnchor.addEventListener("click", function () {
				var menu = document.getElementById("metronomeOptionsContextMenu");
				if (!menu) return;
				var r = optionsAnchor.getBoundingClientRect();
				menu.style.left = Math.round(r.left + window.scrollX) + "px";
				menu.style.top = Math.round(r.bottom + window.scrollY + 6) + "px";
			});
		}

		// ---- time signature: reuse the engine's tested setter ------------
		function applyTimeSig() {
			if (popupTop) popupTop.value = beatsSel.value;
			if (popupBottom) popupBottom.value = denomSel.value;
			gw.timeSigPopupClose("ok");
		}
		beatsSel.addEventListener("change", applyTimeSig);
		denomSel.addEventListener("change", applyTimeSig);

		// ---- mirror engine state back into the new UI --------------------
		function setActive(seg, matchAttr, matchVal) {
			[].forEach.call(seg.querySelectorAll(".gs-seg-btn"), function (b) {
				b.classList.toggle("is-active", b.getAttribute(matchAttr) === matchVal);
			});
		}
		function setDisabledByAttr(seg, attr, val, on) {
			var b = seg.querySelector("[" + attr + '="' + val + '"]');
			if (b) b.classList.toggle("is-disabled", !!on);
		}

		function syncSubdivision() {
			var st = DIV_MAP[currentDivision()] || DIV_MAP[16];
			setActive(noteSeg, "data-value", st.value == null ? "" : String(st.value));
			setActive(feelSeg, "data-feel", st.feel);

			// mirror the engine's own disabling (odd time sigs, non-x/4 triplets)
			setDisabledByAttr(feelSeg, "data-feel", "triplets", hasClass(legacy[12], "disabled"));
			setDisabledByAttr(feelSeg, "data-feel", "mixed", hasClass(legacy[48], "disabled"));
			setDisabledByAttr(noteSeg, "data-value", "8", hasClass(legacy[8], "disabled"));
			// no 1/32 triplet exists in the engine
			setDisabledByAttr(noteSeg, "data-value", "32", st.feel === "triplets");
			// in mixed mode the note-value row does not apply
			noteSeg.classList.toggle("is-inert", st.feel === "mixed");
		}

		function syncTimeSig() {
			if (!timeSigLabel) return;
			var sup = timeSigLabel.querySelector("sup");
			var sub = timeSigLabel.querySelector("sub");
			if (sup) beatsSel.value = sup.textContent.trim();
			if (sub) denomSel.value = sub.textContent.trim();
		}

		var subObserver = new MutationObserver(syncSubdivision);
		Object.keys(legacy).forEach(function (d) {
			if (legacy[d]) subObserver.observe(legacy[d], { attributes: true, attributeFilter: ["class"] });
		});

		var metroObserver = new MutationObserver(syncMetronome);
		Object.keys(metroLegacy).forEach(function (f) {
			if (metroLegacy[f]) metroObserver.observe(metroLegacy[f], { attributes: true, attributeFilter: ["class"] });
		});

		if (timeSigLabel) {
			new MutationObserver(syncTimeSig).observe(timeSigLabel, {
				childList: true,
				subtree: true,
				characterData: true
			});
		}

		syncSubdivision();
		syncMetronome();
		syncTimeSig();
	});
})();
