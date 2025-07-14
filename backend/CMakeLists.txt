cmake_minimum_required(VERSION 3.15)
project(app)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -O2")
add_compile_options(-Wall -Wextra -Wpedantic -Werror)

find_package(CURL REQUIRED)
find_library(TINS_LIB tins REQUIRED PATHS /usr/local/lib)
find_library(PCAP_LIB pcap REQUIRED)

include_directories(include)

add_executable(app
    src/IpTracker.cpp
    src/capture/capture.cpp
    src/lookup/lookup.cpp
    src/platform-dependent/utils.cpp
    src/utils/Logger.cpp
    src/utils/settings.cpp
    src/ui/ui.cpp
    src/utils/lookup_utils/traceroute.cpp
)

target_include_directories(app PRIVATE
    /usr/local/include
    ${CMAKE_SOURCE_DIR}/include
    ${CURL_INCLUDE_DIRS}
)

target_link_libraries(app PRIVATE
    ${TINS_LIB}
    ${PCAP_LIB}
    ${CURL_LIBRARIES}
)
