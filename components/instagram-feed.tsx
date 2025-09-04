import { useState, useEffect, useCallback } from 'react';
import { API } from '../lib/api-client';
import { useAuth } from '../lib/auth-context';

export default function InstagramFeed() {
  const [status, setStatus] = useState<any>(null);
  const [media, setMedia] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();

  // Check if user is admin
  const isAdmin = isAuthenticated && user?.role === 'admin';

  const loadMedia = useCallback(async () => {
    try {
      const data = await API.get('/instagram/media');
      
      if (data.data?.data) {
        setMedia(data.data.data);
      } else {
        setError('Failed to load Instagram media');
      }
    } catch (error) {
      console.error('Error loading media:', error);
      setError('Failed to load Instagram media');
    }
  }, []);

  const checkInstagramStatus = useCallback(async () => {
    try {
      const data = await API.get('/instagram/status');
      setStatus(data);
      
      if (data.data?.connected) {
        loadMedia();
      }
    } catch (error) {
      console.error('Error checking Instagram status:', error);
      setError('Failed to check Instagram connection');
    }
  }, [loadMedia]);

  // Check connection status on mount
  useEffect(() => {
    checkInstagramStatus();
  }, [checkInstagramStatus]);

  const connectInstagram = async () => {
    try {
      const data = await API.get('/instagram/auth-url');
      
      if (data.data?.authorization_url) {
        window.location.href = data.data.authorization_url;
      } else {
        setError('Failed to generate Instagram connection URL');
      }
    } catch (error) {
      console.error('Error connecting Instagram:', error);
      setError('Failed to connect Instagram');
    }
  };

  const syncMedia = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await API.post('/instagram/sync');
      
      if (data.data?.synced !== undefined) {
        await loadMedia(); // Reload media after sync
        alert(`Successfully synced ${data.data.synced} Instagram posts!`);
      } else {
        setError('Failed to sync Instagram media');
      }
    } catch (error) {
      console.error('Error syncing media:', error);
      setError('Failed to sync Instagram media');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Admin Controls - Only visible to admins */}
      {isAdmin && (
        <div className="mb-10 p-6 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center mb-4">
            <svg className="w-5 h-5 text-gray-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Admin Controls</h3>
          </div>
          
          {/* Connection Status */}
          <div className="mb-5">
            {status ? (
              status.data?.connected ? (
                <div className="flex items-center text-green-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Connected to @{status.data.account?.username}</span>
                  <span className="text-green-600 ml-3 text-sm">
                    {status.data.account?.media_count} posts • {status.data.account?.followers_count} followers
                  </span>
                </div>
              ) : (
                <div className="flex items-center text-red-700 bg-red-50 px-3 py-2 rounded-lg border border-red-200">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Instagram not connected</span>
                </div>
              )
            ) : (
              <div className="flex items-center text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Checking connection...</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {!status?.data?.connected ? (
              <button
                onClick={connectInstagram}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                Connect Instagram
              </button>
            ) : (
              <>
                <button
                  onClick={syncMedia}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Syncing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Sync Media
                    </>
                  )}
                </button>
                <button
                  onClick={checkInstagramStatus}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Status
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Instagram Gallery Grid */}
      {media.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {media.map((item) => (
            <div key={item.id} className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100">
              {/* Media Content */}
              {item.media_type === 'IMAGE' && (
                <div className="aspect-square overflow-hidden bg-gray-50">
                  <img
                    src={item.media_url}
                    alt={item.caption || 'Instagram post'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              )}
              {item.media_type === 'VIDEO' && (
                <div className="aspect-square overflow-hidden relative bg-gray-50">
                  <img
                    src={item.thumbnail_url || item.media_url}
                    alt={item.caption || 'Instagram video'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black bg-opacity-75 rounded-full p-4 group-hover:bg-opacity-90 transition-all duration-300">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M8 5v10l8-5-8-5z"/>
                      </svg>
                    </div>
                  </div>
                  <div className="absolute top-3 left-3 bg-black bg-opacity-75 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v10l8-5-8-5z"/>
                    </svg>
                    VIDEO
                  </div>
                </div>
              )}
              {item.media_type === 'CAROUSEL_ALBUM' && (
                <div className="aspect-square overflow-hidden relative bg-gray-50">
                  <img
                    src={item.media_url}
                    alt={item.caption || 'Instagram carousel'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Carousel Indicator */}
                  <div className="absolute top-3 right-3 bg-black bg-opacity-80 text-white px-3 py-1.5 rounded-full text-xs font-semibold flex items-center shadow-lg">
                    <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
                    </svg>
                    {item.carousel_children?.length || 1}
                  </div>
                  {/* Thumbnail Strip - Enhanced */}
                  {item.carousel_children && item.carousel_children.length > 0 && (
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex space-x-1.5 overflow-x-auto scrollbar-hide">
                        {item.carousel_children.slice(0, 5).map((child: any, index: number) => (
                          <div key={child.id} className="relative flex-shrink-0">
                            <img
                              src={child.thumbnail_url || child.media_url}
                              alt={`Carousel item ${index + 1}`}
                              className="w-8 h-8 object-cover rounded-lg border-2 border-white shadow-sm"
                            />
                          </div>
                        ))}
                        {item.carousel_children.length > 5 && (
                          <div className="w-8 h-8 bg-black bg-opacity-80 text-white text-xs flex items-center justify-center rounded-lg border-2 border-white shadow-sm flex-shrink-0 font-medium">
                            +{item.carousel_children.length - 5}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Caption and Details */}
              <div className="p-5">
                {item.caption && (
                  <p className="text-sm text-gray-700 line-clamp-3 mb-3 leading-relaxed">
                    {item.caption}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <time className="text-xs text-gray-500 font-medium">
                    {new Date(item.timestamp).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </time>
                  {item.permalink && (
                    <a
                      href={item.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-xs text-pink-600 hover:text-pink-700 font-medium transition-colors bg-pink-50 hover:bg-pink-100 px-2 py-1 rounded-full"
                    >
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                      View on IG
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Empty state - show when no media or not connected
        <div className="text-center py-20">
          {status?.data?.connected ? (
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">No posts yet</h3>
              <p className="text-gray-600 leading-relaxed">
                {isAdmin ? (
                  <>
                    Ready to showcase your work? Click <span className="font-medium text-green-600">&quot;Sync Media&quot;</span> above to fetch your latest Instagram posts.
                  </>
                ) : (
                  'Our gallery is being curated with the latest work. Check back soon to see our beautiful transformations!'
                )}
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-pink-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Instagram Gallery Coming Soon</h3>
              <p className="text-gray-600 leading-relaxed">
                We&apos;re setting up our Instagram feed to showcase our latest haircuts and transformations. 
                Stay tuned for an inspiring gallery of our work!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}