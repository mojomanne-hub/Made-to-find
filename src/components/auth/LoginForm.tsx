
" /> Anmelden…</>
          : "Anmelden"}
      </button>

      {/* Trenner */}
      <div className="flex items-center gap-3 py-1">
        <div className="flex-1 h-px" style={{ backgroundColor: "#2d3f55" }} />
        <span className="text-xs" style={{ color: "#64748b" }}>oder</span>
        <div className="flex-1 h-px" style={{ backgroundColor: "#2d3f55" }} />
      </div>

      <GoogleSignInButton label="Mit Google anmelden" />
    </form>
  );
}
