cmake_minimum_required(VERSION 3.15)
project(hovia VERSION 0.1 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Use target-specific compile options
add_executable(hovia
    src/main.cpp
    src/ipTracker/ipTracker.cpp
    src/capture/capture.cpp
    src/lookup/lookup.cpp
    src/platform_dependent/network_interface/network_interface.cpp
    src/platform_dependent/traceroute/traceroute.cpp
    src/utils/logger/logger.cpp
    src/utils/settings/settings.cpp
    src/api/api.cpp
)

target_compile_options(hovia PRIVATE
    -O2 -Wall -Wextra -Wpedantic -Werror
)

find_package(CURL REQUIRED)
find_library(PCAP_LIB pcap REQUIRED)

# For libtins, if no find_package module available, you can keep find_library,
# but try to find official CMake config or pkg-config if possible.
find_library(TINS_LIB tins PATHS /usr/local/lib REQUIRED)

target_include_directories(hovia PRIVATE
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/src
    ${CURL_INCLUDE_DIRS}
    # Prefer variable-based include dir for TINS if found
)

target_link_libraries(hovia PRIVATE
    ${TINS_LIB}
    ${PCAP_LIBRARIES} # From find_package(PCAP)
    ${CURL_LIBRARIES}
)
