import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import Modal from "react-native-modal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AntDesign } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

interface Tag {
  id: string;
  name: string;
  groupId?: string;
  isTimeTag?: boolean;
}

interface TagGroup {
  id: string;
  name: string;
  tags: Tag[];
}

interface TagModalProps {
  visible: boolean;
  onClose: () => void;
  image: {
    id: string;
    uri: string;
    tags: Tag[];
  } | null;
  onUpdateTags: (tags: Tag[]) => void;
}

const TagModal: React.FC<TagModalProps> = ({ visible, onClose, image, onUpdateTags }) => {
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [timeTag, setTimeTag] = useState("");

  useEffect(() => {
    loadTagGroups();
    if (image?.tags) {
      setSelectedTags(image.tags);
    }
  }, [image]);

  const loadTagGroups = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem("tagGroups");
      if (savedGroups) {
        setTagGroups(JSON.parse(savedGroups));
      }
    } catch (error) {
      console.error("加载标签组失败:", error);
      Toast.show({
        type: "error",
        text1: "错误",
        text2: "加载标签组失败",
      });
    }
  };

  const saveTagGroups = async (groups: TagGroup[]) => {
    try {
      await AsyncStorage.setItem("tagGroups", JSON.stringify(groups));
      setTagGroups(groups);
    } catch (error) {
      console.error("保存标签组失败:", error);
      Toast.show({
        type: "error",
        text1: "错误",
        text2: "保存标签组失败",
      });
    }
  };

  const addGroup = () => {
    if (!newGroupName.trim()) return;
    const newGroup: TagGroup = {
      id: Date.now().toString(),
      name: newGroupName,
      tags: [],
    };
    const updatedGroups = [...tagGroups, newGroup];
    saveTagGroups(updatedGroups);
    setNewGroupName("");
    Toast.show({
      type: "success",
      text1: "成功",
      text2: `已添加分组「${newGroupName}」`,
    });
  };

  const addTag = () => {
    if (!newTagName.trim() || !selectedGroupId) return;
    const updatedGroups = tagGroups.map((group) => {
      if (group.id === selectedGroupId) {
        return {
          ...group,
          tags: [
            ...group.tags,
            {
              id: Date.now().toString(),
              name: newTagName,
            },
          ],
        };
      }
      return group;
    });
    saveTagGroups(updatedGroups);
    setNewTagName("");
    setSelectedGroupId(null);
    Toast.show({
      type: "success",
      text1: "成功",
      text2: `已添加标签「${newTagName}」`,
    });
  };

  const addTimeTag = () => {
    if (!timeTag.trim()) return;

    const timeTagObject: Tag = {
      id: `time-${Date.now().toString()}`,
      name: timeTag,
      isTimeTag: true,
    };

    // Check if we already have a time tag
    const existingTimeTagIndex = selectedTags.findIndex((tag) => tag.isTimeTag);

    let newSelectedTags: Tag[];
    if (existingTimeTagIndex >= 0) {
      // Replace existing time tag
      newSelectedTags = [...selectedTags];
      newSelectedTags[existingTimeTagIndex] = timeTagObject;
    } else {
      // Add new time tag
      newSelectedTags = [...selectedTags, timeTagObject];
    }

    setSelectedTags(newSelectedTags);
    setTimeTag("");
    Toast.show({
      type: "success",
      text1: "成功",
      text2: `已设置时间标签「${timeTag}」`,
    });
  };

  const toggleTag = (groupId: string, tag: Tag) => {
    const isSelected = selectedTags.some((t) => t.id === tag.id);
    let newSelectedTags: Tag[];
    if (isSelected) {
      newSelectedTags = selectedTags.filter((t) => t.id !== tag.id);
    } else {
      newSelectedTags = [...selectedTags, { ...tag, groupId }];
    }
    setSelectedTags(newSelectedTags);
  };

  const deleteGroup = (groupId: string) => {
    Alert.alert("删除分组", "确定要删除这个分组吗？删除后分组内的所有标签都会被删除。", [
      { text: "取消" },
      {
        text: "确定",
        onPress: () => {
          const groupToDelete = tagGroups.find((g) => g.id === groupId);
          const updatedGroups = tagGroups.filter((group) => group.id !== groupId);
          saveTagGroups(updatedGroups);
          setSelectedTags(selectedTags.filter((tag) => tag.groupId !== groupId));
          Toast.show({
            type: "success",
            text1: "成功",
            text2: `已删除分组「${groupToDelete?.name || ""}」`,
          });
        },
      },
    ]);
  };

  const deleteTag = (groupId: string, tagId: string) => {
    const groupWithTag = tagGroups.find((g) => g.id === groupId);
    const tagToDelete = groupWithTag?.tags.find((t) => t.id === tagId);

    Alert.alert("删除标签", "确定要删除这个标签吗？", [
      { text: "取消" },
      {
        text: "确定",
        onPress: () => {
          const updatedGroups = tagGroups.map((group) => {
            if (group.id === groupId) {
              return {
                ...group,
                tags: group.tags.filter((tag) => tag.id !== tagId),
              };
            }
            return group;
          });
          saveTagGroups(updatedGroups);
          setSelectedTags(selectedTags.filter((tag) => tag.id !== tagId));
          Toast.show({
            type: "success",
            text1: "成功",
            text2: `已删除标签「${tagToDelete?.name || ""}」`,
          });
        },
      },
    ]);
  };

  const handleSave = () => {
    const tags = selectedTags.sort((a, b) => {
      if (a.isTimeTag && !b.isTimeTag) return -1;
      if (!a.isTimeTag && b.isTimeTag) return 1;
      return a.name.localeCompare(b.name, "zh-CN");
    });

    onUpdateTags(tags);
    onClose();
    Toast.show({
      type: "success",
      text1: "成功",
      text2: "标签已保存",
    });
  };

  return (
    <Modal isVisible={visible} onBackdropPress={onClose} style={styles.modal}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>标签管理</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveButton}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Time Tag Section */}
        <View style={styles.timeTagSection}>
          <Text style={styles.sectionTitle}>时间标签</Text>
          <View style={styles.timeTagInputContainer}>
            <TextInput
              style={styles.input}
              placeholder="输入时间标签 (如: 2024年6月)"
              value={timeTag}
              onChangeText={setTimeTag}
            />
            <TouchableOpacity style={styles.addButton} onPress={addTimeTag}>
              <AntDesign name="clockcircleo" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Display selected time tag if exists */}
          {selectedTags.some((tag) => tag.isTimeTag) && (
            <View style={styles.selectedTimeTag}>
              <Text style={styles.selectedTimeTagLabel}>当前时间标签:</Text>
              {selectedTags
                .filter((tag) => tag.isTimeTag)
                .map((tag) => (
                  <View key={tag.id} style={styles.timeTagBadge}>
                    <Text style={styles.timeTagText}>{tag.name}</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedTags(selectedTags.filter((t) => !t.isTimeTag))}
                      style={styles.removeTimeTagButton}>
                      <AntDesign name="close" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          )}
        </View>

        <View style={styles.addSection}>
          <View style={styles.addGroupSection}>
            <TextInput
              style={styles.input}
              placeholder="新建分组"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            <TouchableOpacity style={styles.addButton} onPress={addGroup}>
              <AntDesign name="plus" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.addTagSection}>
            <View style={styles.tagInputContainer}>
              <TextInput
                style={[styles.input, !selectedGroupId && styles.inputDisabled]}
                placeholder={selectedGroupId ? "新建标签" : "请先选择分组"}
                value={newTagName}
                onChangeText={setNewTagName}
                editable={!!selectedGroupId}
              />
              <TouchableOpacity
                style={[styles.addButton, !selectedGroupId && styles.disabled]}
                onPress={addTag}
                disabled={!selectedGroupId}>
                <AntDesign name="plus" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView style={styles.groupsContainer}>
          {tagGroups.map((group) => (
            <View key={group.id} style={styles.groupSection}>
              <TouchableOpacity
                style={[
                  styles.groupHeader,
                  selectedGroupId === group.id && styles.groupHeaderSelected,
                ]}
                onPress={() => {
                  setSelectedGroupId(selectedGroupId === group.id ? null : group.id);
                }}>
                <View style={styles.groupHeaderLeft}>
                  <Text style={styles.groupName}>{group.name}</Text>
                </View>
                <View style={styles.groupHeaderRight}>
                  <TouchableOpacity
                    onPress={(e) => {
                      e.stopPropagation();
                      deleteGroup(group.id);
                    }}
                    style={styles.deleteGroupButton}>
                    <AntDesign name="delete" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
              <>
                <View style={styles.tagsContainer}>
                  {group.tags.map((tag) => (
                    <TouchableOpacity
                      key={tag.id}
                      style={[
                        styles.tag,
                        selectedTags.some((t) => t.id === tag.id) && styles.tagSelected,
                      ]}
                      onPress={() => toggleTag(group.id, tag)}
                      onLongPress={() => deleteTag(group.id, tag.id)}>
                      <Text
                        style={[
                          styles.tagText,
                          selectedTags.some((t) => t.id === tag.id) && styles.tagSelectedText,
                        ]}>
                        {tag.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "white",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 24,
    height: "85%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  saveButton: {
    color: "#2196F3",
    fontSize: 17,
    fontWeight: "600",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  sortButton: {
    marginRight: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  sortButtonText: {
    color: "#FF9800",
    fontSize: 17,
    fontWeight: "600",
  },
  addSection: {
    marginBottom: 16,
  },
  addGroupSection: {
    flexDirection: "row",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  addTagSection: {
    paddingHorizontal: 4,
  },
  tagInputContainer: {
    flexDirection: "row",
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#e0e0e0",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    fontSize: 15,
    backgroundColor: "#fafafa",
  },
  addButton: {
    backgroundColor: "#2196F3",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#2196F3",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  disabled: {
    backgroundColor: "#bdbdbd",
    opacity: 0.7,
  },
  groupsContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  groupSection: {
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  groupHeaderSelected: {
    backgroundColor: "#e3f2fd",
    borderColor: "#2196F3",
    borderWidth: 1,
  },
  inputDisabled: {
    backgroundColor: "#f5f5f5",
    borderColor: "#ddd",
  },
  groupHeaderLeft: {
    flex: 1,
  },
  groupHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteGroupButton: {
    marginRight: 16,
    padding: 8,
  },
  groupName: {
    fontSize: 17,
    fontWeight: "600",
    color: "#2c3e50",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  tag: {
    backgroundColor: "#f1f3f5",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },
  tagSelected: {
    backgroundColor: "#2196F3",
    borderColor: "#1976D2",
  },
  tagText: {
    color: "#495057",
    fontSize: 15,
    fontWeight: "500",
  },
  tagSelectedText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  timeTagSection: {
    marginBottom: 24,
    padding: 4,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 10,
    color: "#333",
  },
  timeTagInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  selectedTimeTag: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  selectedTimeTagLabel: {
    fontSize: 14,
    color: "#666",
    marginRight: 8,
  },
  timeTagBadge: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  timeTagText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
    marginRight: 5,
  },
  removeTimeTagButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TagModal;
