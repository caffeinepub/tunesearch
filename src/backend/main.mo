import Map "mo:core/Map";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Outcall "./http-outcalls/outcall";
import AccessControl "./authorization/access-control";
import MixinAuthorization "./authorization/MixinAuthorization";

actor {
  type Track = {
    videoId : Text;
    title : Text;
    thumbnail : Text;
    channelName : Text;
    duration : Text;
    isCreativeCommons : Bool;
  };

  type Playlist = {
    id : Nat;
    name : Text;
    tracks : [Track];
    createdAt : Int;
  };

  type UserPrefs = {
    theme : Text;
    equalizerPreset : Text;
    sleepTimer : Nat;
  };

  type UserData = {
    var favourites : [Track];
    var playlists : [Playlist];
    var recentlyPlayed : [Track];
    var searchHistory : [Text];
    var queue : [Track];
    var prefs : UserPrefs;
    var nextPlaylistId : Nat;
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  var youtubeApiKey : Text = "";
  let userData : Map.Map<Principal, UserData> = Map.empty();

  func requireAuth(caller : Principal) {
    if (caller.isAnonymous()) { assert false };
  };

  func getOrCreateUser(caller : Principal) : UserData {
    switch (userData.get(caller)) {
      case (?ud) { ud };
      case (null) {
        let fresh : UserData = {
          var favourites = [];
          var playlists = [];
          var recentlyPlayed = [];
          var searchHistory = [];
          var queue = [];
          var prefs = { theme = "dark"; equalizerPreset = "Flat"; sleepTimer = 0 };
          var nextPlaylistId = 1;
        };
        userData.add(caller, fresh);
        fresh;
      };
    };
  };

  func jsonEscape(t : Text) : Text {
    var r = t.replace(#text "\\", "\\\\");
    r := r.replace(#text "\"", "\\\"");
    r := r.replace(#text "\n", "\\n");
    r := r.replace(#text "\r", "\\r");
    r;
  };

  func trackToJson(t : Track) : Text {
    "{\"videoId\":\"" # jsonEscape(t.videoId) # "\"," #
    "\"title\":\"" # jsonEscape(t.title) # "\"," #
    "\"thumbnail\":\"" # jsonEscape(t.thumbnail) # "\"," #
    "\"channelName\":\"" # jsonEscape(t.channelName) # "\"," #
    "\"duration\":\"" # jsonEscape(t.duration) # "\"," #
    "\"isCreativeCommons\":" # (if (t.isCreativeCommons) "true" else "false") # "}";
  };

  func joinTexts(items : [Text], sep : Text) : Text {
    var result = "";
    var first = true;
    for (item in items.vals()) {
      if (first) { result := item; first := false }
      else { result := result # sep # item };
    };
    result;
  };

  func tracksToJson(tracks : [Track]) : Text {
    let parts = tracks.map(trackToJson);
    "[" # joinTexts(parts, ",") # "]";
  };

  func playlistToJson(p : Playlist) : Text {
    "{\"id\":" # p.id.toText() # "," #
    "\"name\":\"" # jsonEscape(p.name) # "\"," #
    "\"tracks\":" # tracksToJson(p.tracks) # "," #
    "\"createdAt\":" # p.createdAt.toText() # "}";
  };

  func trim50<T>(arr : [T]) : [T] {
    if (arr.size() > 50) arr.sliceToArray(0, 50) else arr;
  };

  func trim20<T>(arr : [T]) : [T] {
    if (arr.size() > 20) arr.sliceToArray(0, 20) else arr;
  };

  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    { input.response with headers = [] };
  };

  public shared ({ caller }) func updateApiKey(key : Text) : async () {
    if (youtubeApiKey == "" or AccessControl.isAdmin(accessControlState, caller)) {
      youtubeApiKey := key;
    } else {
      assert false;
    };
  };

  public query func getApiKeyStatus() : async Bool {
    youtubeApiKey != "";
  };

  public func searchYouTube(searchQuery : Text, pageToken : Text) : async Text {
    if (youtubeApiKey == "") { return "{\"error\":\"API key not configured\",\"items\":[]}" };
    if (searchQuery.size() == 0 or searchQuery.size() > 200) { return "{\"error\":\"Invalid query\",\"items\":[]}" };
    let enc = searchQuery.replace(#text " ", "+");
    let pp = if (pageToken == "") "" else "&pageToken=" # pageToken;
    let url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&videoLicense=creativeCommon&q=" # enc # pp # "&key=" # youtubeApiKey;
    try { await Outcall.httpGetRequest(url, [], transform) }
    catch (_) { "{\"error\":\"Search failed\",\"items\":[]}" };
  };

  public func searchYouTubeAll(searchQuery : Text, pageToken : Text) : async Text {
    if (youtubeApiKey == "") { return "{\"error\":\"API key not configured\",\"items\":[]}" };
    if (searchQuery.size() == 0 or searchQuery.size() > 200) { return "{\"error\":\"Invalid query\",\"items\":[]}" };
    let enc = searchQuery.replace(#text " ", "+");
    let pp = if (pageToken == "") "" else "&pageToken=" # pageToken;
    let url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=" # enc # pp # "&key=" # youtubeApiKey;
    try { await Outcall.httpGetRequest(url, [], transform) }
    catch (_) { "{\"error\":\"Search failed\",\"items\":[]}" };
  };

  public func getVideoDetails(videoIds : Text) : async Text {
    if (youtubeApiKey == "") { return "{\"error\":\"API key not configured\",\"items\":[]}" };
    let url = "https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=" # videoIds # "&key=" # youtubeApiKey;
    try { await Outcall.httpGetRequest(url, [], transform) }
    catch (_) { "{\"error\":\"Failed\",\"items\":[]}" };
  };

  public shared ({ caller }) func addFavourite(track : Track) : async () {
    requireAuth(caller);
    let ud = getOrCreateUser(caller);
    let exists = ud.favourites.find(func(t : Track) : Bool { t.videoId == track.videoId });
    if (exists == null) {
      ud.favourites := ud.favourites.concat([track]);
    };
  };

  public shared ({ caller }) func removeFavourite(videoId : Text) : async () {
    requireAuth(caller);
    let ud = getOrCreateUser(caller);
    ud.favourites := ud.favourites.filter(func(t : Track) : Bool { t.videoId != videoId });
  };

  public shared ({ caller }) func getFavourites() : async Text {
    requireAuth(caller);
    tracksToJson(getOrCreateUser(caller).favourites);
  };

  public shared ({ caller }) func createPlaylist(name : Text) : async Nat {
    requireAuth(caller);
    if (name.size() == 0 or name.size() > 100) { return 0 };
    let ud = getOrCreateUser(caller);
    let id = ud.nextPlaylistId;
    ud.nextPlaylistId := id + 1;
    ud.playlists := ud.playlists.concat([{ id; name; tracks = []; createdAt = Time.now() }]);
    id;
  };

  public shared ({ caller }) func renamePlaylist(id : Nat, name : Text) : async () {
    requireAuth(caller);
    if (name.size() == 0 or name.size() > 100) { return };
    let ud = getOrCreateUser(caller);
    ud.playlists := ud.playlists.map(func(p : Playlist) : Playlist {
      if (p.id == id) { { p with name } } else { p };
    });
  };

  public shared ({ caller }) func deletePlaylist(id : Nat) : async () {
    requireAuth(caller);
    let ud = getOrCreateUser(caller);
    ud.playlists := ud.playlists.filter(func(p : Playlist) : Bool { p.id != id });
  };

  public shared ({ caller }) func addTrackToPlaylist(id : Nat, track : Track) : async () {
    requireAuth(caller);
    let ud = getOrCreateUser(caller);
    ud.playlists := ud.playlists.map(func(p : Playlist) : Playlist {
      if (p.id == id) {
        let exists = p.tracks.find(func(t : Track) : Bool { t.videoId == track.videoId });
        if (exists == null) { { p with tracks = p.tracks.concat([track]) } }
        else { p };
      } else { p };
    });
  };

  public shared ({ caller }) func removeTrackFromPlaylist(playlistId : Nat, videoId : Text) : async () {
    requireAuth(caller);
    let ud = getOrCreateUser(caller);
    ud.playlists := ud.playlists.map(func(p : Playlist) : Playlist {
      if (p.id == playlistId) {
        { p with tracks = p.tracks.filter(func(t : Track) : Bool { t.videoId != videoId }) };
      } else { p };
    });
  };

  public shared ({ caller }) func getPlaylists() : async Text {
    requireAuth(caller);
    let ud = getOrCreateUser(caller);
    let parts = ud.playlists.map(playlistToJson);
    "[" # joinTexts(parts, ",") # "]";
  };

  public shared ({ caller }) func recordPlayed(track : Track) : async () {
    requireAuth(caller);
    let ud = getOrCreateUser(caller);
    let filtered = ud.recentlyPlayed.filter(func(t : Track) : Bool { t.videoId != track.videoId });
    ud.recentlyPlayed := trim50([track].concat(filtered));
  };

  public shared ({ caller }) func getRecentlyPlayed() : async Text {
    requireAuth(caller);
    tracksToJson(getOrCreateUser(caller).recentlyPlayed);
  };

  public shared ({ caller }) func recordSearch(searchQuery : Text) : async () {
    requireAuth(caller);
    if (searchQuery.size() == 0 or searchQuery.size() > 200) { return };
    let ud = getOrCreateUser(caller);
    let filtered = ud.searchHistory.filter(func(q : Text) : Bool { q != searchQuery });
    ud.searchHistory := trim20([searchQuery].concat(filtered));
  };

  public shared ({ caller }) func getSearchHistory() : async Text {
    requireAuth(caller);
    let ud = getOrCreateUser(caller);
    let parts = ud.searchHistory.map(func(q : Text) : Text { "\"" # jsonEscape(q) # "\"" });
    "[" # joinTexts(parts, ",") # "]";
  };

  public shared ({ caller }) func clearSearchHistory() : async () {
    requireAuth(caller);
    getOrCreateUser(caller).searchHistory := [];
  };

  public shared ({ caller }) func setQueue(tracks : [Track]) : async () {
    requireAuth(caller);
    getOrCreateUser(caller).queue := tracks;
  };

  public shared ({ caller }) func getQueue() : async Text {
    requireAuth(caller);
    tracksToJson(getOrCreateUser(caller).queue);
  };

  public shared ({ caller }) func setPreferences(prefs : UserPrefs) : async () {
    requireAuth(caller);
    getOrCreateUser(caller).prefs := prefs;
  };

  public shared ({ caller }) func getPreferences() : async UserPrefs {
    requireAuth(caller);
    getOrCreateUser(caller).prefs;
  };
};
