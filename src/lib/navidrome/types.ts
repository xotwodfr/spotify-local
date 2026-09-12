export interface SubsonicError {
  code: number;
  message: string;
}

export interface SubsonicResponse<T> {
  "subsonic-response": T & {
    status: "ok" | "failed";
    error?: SubsonicError;
  };
}

export interface NArtist {
  id: string;
  name: string;
  albumCount?: number;
  coverArt?: string;
  artistImageUrl?: string;
}

export interface NAlbum {
  id: string;
  name: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  songCount?: number;
  duration?: number;
  year?: number;
  genre?: string;
  created?: string;
  playCount?: number;
  starred?: boolean;
}

export interface NSong {
  id: string;
  title: string;
  album?: string;
  albumId?: string;
  parent?: string;
  artist?: string;
  artistId?: string;
  coverArt?: string;
  duration?: number;
  track?: number;
  year?: number;
  genre?: string;
  path?: string;
  explicit?: boolean;
  starred?: boolean;
  playCount?: number;
}

export interface NPlaylist {
  id: string;
  name: string;
  comment?: string;
  owner?: string;
  public?: boolean;
  songCount?: number;
  duration?: number;
  created?: string;
  changed?: string;
  coverArt?: string;
}

export interface NPlayQueue {
  current?: string;
  position?: number;
  changed?: string;
  changedBy?: string;
  entry?: NSong[];
}